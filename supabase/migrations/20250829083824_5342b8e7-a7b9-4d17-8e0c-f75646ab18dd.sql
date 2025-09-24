-- =====================================
-- PHASE 1: CRITICAL SECURITY & DATABASE FIXES (CORRECTED)
-- =====================================

-- Fix 1: Schema Inconsistencies - Create missing friends view and fix friendships table
-- The logs show "relation public.friends does not exist"

-- Create a view to bridge the schema gap and prevent "public.friends does not exist" errors
CREATE OR REPLACE VIEW public.friends AS
SELECT 
  profile_low as profile_id,
  profile_high as friend_id,
  friend_state,
  created_at,
  responded_at
FROM public.friendships;

-- Fix 2: Add missing column to friend_requests if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'friend_requests' 
                 AND column_name = 'friend_id') THEN
    ALTER TABLE public.friend_requests 
    ADD COLUMN friend_id uuid;
  END IF;
END $$;

-- Fix 3: Enable RLS on critical location tables that are missing security
-- These tables contain sensitive location data but have no RLS protection

-- Enable RLS on raw_locations_staging (uses profile_id not user_id)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'raw_locations_staging') THEN
    EXECUTE 'ALTER TABLE public.raw_locations_staging ENABLE ROW LEVEL SECURITY';
    EXECUTE 'CREATE POLICY "users_own_staged_locations" ON public.raw_locations_staging FOR ALL USING (profile_id = auth.uid())';
  END IF;
END $$;

-- Enable RLS on raw_locations main table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'raw_locations') THEN
    EXECUTE 'ALTER TABLE public.raw_locations ENABLE ROW LEVEL SECURITY';
    EXECUTE 'CREATE POLICY "users_own_raw_locations" ON public.raw_locations FOR ALL USING (profile_id = auth.uid())';
  END IF;
END $$;

-- Enable RLS on venue_stays table to protect sensitive location/venue data
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'venue_stays' AND policyname = 'users_own_venue_stays') THEN
    EXECUTE 'ALTER TABLE public.venue_stays ENABLE ROW LEVEL SECURITY';
    EXECUTE 'CREATE POLICY "users_own_venue_stays" ON public.venue_stays FOR ALL USING (profile_id = auth.uid())';
  END IF;
END $$;

-- Fix 4: Enable RLS on time-partitioned location tables if they exist
-- Check for actual partitioned tables and their schemas
DO $$
DECLARE
  table_record record;
BEGIN
  FOR table_record IN 
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name LIKE 'raw_locations_%'
    AND table_name ~ '^raw_locations_\d{6}$'
  LOOP
    -- Check if table has profile_id or user_id column
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = table_record.table_name 
               AND column_name IN ('profile_id', 'user_id')) THEN
      
      -- Enable RLS
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_record.table_name);
      
      -- Create policy based on available column
      IF EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = table_record.table_name 
                 AND column_name = 'profile_id') THEN
        EXECUTE format('CREATE POLICY "users_own_%I" ON public.%I FOR ALL USING (profile_id = auth.uid())', 
                      table_record.table_name, table_record.table_name);
      ELSIF EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name = table_record.table_name 
                    AND column_name = 'user_id') THEN
        EXECUTE format('CREATE POLICY "users_own_%I" ON public.%I FOR ALL USING (user_id = auth.uid())', 
                      table_record.table_name, table_record.table_name);
      END IF;
    END IF;
  END LOOP;
END $$;

-- Fix 5: Grant proper execute permissions on public functions to prevent access errors
-- Only grant if functions exist
DO $$
BEGIN
  -- Grant execute on presence functions if they exist
  IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'upsert_presence') THEN
    GRANT EXECUTE ON FUNCTION public.upsert_presence TO authenticated;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_nearby_people') THEN
    GRANT EXECUTE ON FUNCTION public.get_nearby_people TO authenticated;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'upsert_friendship') THEN
    GRANT EXECUTE ON FUNCTION public.upsert_friendship TO authenticated;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'accept_friend_request') THEN
    GRANT EXECUTE ON FUNCTION public.accept_friend_request TO authenticated;
  END IF;
END $$;

-- Fix 6: Create a UUID validation function to prevent parsing errors
CREATE OR REPLACE FUNCTION public.validate_uuid_param(input_text text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Remove any trailing query parameters that got concatenated
  IF position(',' in input_text) > 0 THEN
    input_text := split_part(input_text, ',', 1);
  END IF;
  
  -- Validate and return the UUID
  RETURN input_text::uuid;
EXCEPTION
  WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'Invalid UUID format: %', input_text;
END;
$$;