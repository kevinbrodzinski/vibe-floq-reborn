BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 1: CRITICAL SECURITY & DATABASE FIXES
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Fix missing RLS on raw_locations_staging
-- This table contains sensitive location data and MUST have RLS
ALTER TABLE public.raw_locations_staging ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own staging location data"
ON public.raw_locations_staging
FOR ALL
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

-- 2. Ensure raw_locations has proper RLS policies (it has RLS enabled but need to verify policies)
DROP POLICY IF EXISTS "users_own_location_data" ON public.raw_locations;
CREATE POLICY "users_own_location_data"
ON public.raw_locations
FOR ALL
USING (profile_id = auth.uid()) 
WITH CHECK (profile_id = auth.uid());

-- 3. Fix friendship schema consistency issues
-- The logs show queries looking for 'friends' table and 'profile_id_a' columns
-- Let's create a view to bridge the schema gap and prevent the UUID parsing errors

CREATE OR REPLACE VIEW public.friends AS
SELECT 
  profile_low as user_a,
  profile_high as user_b,
  friend_state as status,
  created_at,
  responded_at
FROM public.friendships
WHERE friend_state = 'accepted';

-- Grant access to the view
GRANT SELECT ON public.friends TO authenticated, anon;

-- Add RLS to the view to ensure users only see their own friendships
CREATE POLICY "friends_view_access" ON public.friends
FOR SELECT
USING (auth.uid() IN (user_a, user_b));

-- 4. Fix friend_requests schema to prevent UUID parsing errors
-- Ensure the table has consistent column naming
ALTER TABLE public.friend_requests 
ADD COLUMN IF NOT EXISTS friend_id uuid;

-- Update friend_id to match other_profile_id if it's null
UPDATE public.friend_requests 
SET friend_id = other_profile_id 
WHERE friend_id IS NULL;

-- 5. Add missing RLS policies for venue-related sensitive data
-- Check if venue_stays needs RLS
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'venue_stays' AND schemaname = 'public') THEN
        -- Enable RLS if not already enabled
        EXECUTE 'ALTER TABLE public.venue_stays ENABLE ROW LEVEL SECURITY';
        
        -- Drop existing policy if exists and recreate
        DROP POLICY IF EXISTS "users_own_venue_stays" ON public.venue_stays;
        CREATE POLICY "users_own_venue_stays"
        ON public.venue_stays
        FOR ALL
        USING (profile_id = auth.uid())
        WITH CHECK (profile_id = auth.uid());
    END IF;
END $$;

-- 6. Ensure all time-partitioned location tables have RLS
-- Check for pattern raw_locations_YYYYMM tables and add RLS
DO $$
DECLARE
    tbl record;
BEGIN
    FOR tbl IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename LIKE 'raw_locations_%'
        AND tablename ~ '^raw_locations_[0-9]{6}$'
    LOOP
        -- Enable RLS on each partitioned table
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl.tablename);
        
        -- Add policy
        EXECUTE format('
            CREATE POLICY IF NOT EXISTS "users_own_location_data_partition"
            ON public.%I
            FOR ALL
            USING (profile_id = auth.uid())
            WITH CHECK (profile_id = auth.uid())
        ', tbl.tablename);
    END LOOP;
END $$;

-- 7. Fix function permissions that might be causing service role errors
-- Ensure critical functions have proper permissions
GRANT EXECUTE ON FUNCTION public.upsert_presence TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_nearby_people TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_friendship TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_friend_request TO authenticated;

-- 8. Add input validation function to prevent UUID parsing errors
CREATE OR REPLACE FUNCTION public.validate_uuid_param(input_text text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Clean the input by removing any filter parameters
    IF input_text LIKE '%,%' THEN
        input_text := split_part(input_text, ',', 1);
    END IF;
    
    -- Validate it's a proper UUID
    RETURN input_text::uuid;
EXCEPTION
    WHEN invalid_text_representation THEN
        RAISE EXCEPTION 'Invalid UUID format: %', input_text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_uuid_param TO authenticated, anon;

COMMIT;