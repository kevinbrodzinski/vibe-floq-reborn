-- =====================================
-- PHASE 1: CRITICAL SECURITY & DATABASE FIXES
-- =====================================

-- Fix 1: Schema Inconsistencies - Create missing friends view and fix friendships table
-- The logs show "relation public.friends does not exist" and "column friendships.profile_id_a does not exist"

-- First, let's standardize the friendships table schema
-- The existing friendships table uses profile_low/profile_high, but some code expects profile_id_a/profile_id_b

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
-- Some code may expect a friend_id column
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

-- Enable RLS on raw_locations_staging
ALTER TABLE public.raw_locations_staging ENABLE ROW LEVEL SECURITY;

-- Add policy for users to only see their own location data
CREATE POLICY "users_own_staged_locations" ON public.raw_locations_staging
  FOR ALL USING (user_id = auth.uid());

-- Enable RLS on raw_locations main table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'raw_locations') THEN
    EXECUTE 'ALTER TABLE public.raw_locations ENABLE ROW LEVEL SECURITY';
    EXECUTE 'CREATE POLICY "users_own_raw_locations" ON public.raw_locations FOR ALL USING (user_id = auth.uid())';
  END IF;
END $$;

-- Enable RLS on venue_stays table to protect sensitive location/venue data
ALTER TABLE public.venue_stays ENABLE ROW LEVEL SECURITY;

-- Add policy for users to only see their own venue stays
CREATE POLICY "users_own_venue_stays" ON public.venue_stays
  FOR ALL USING (profile_id = auth.uid());

-- Fix 4: Enable RLS on time-partitioned location tables
-- The logs show errors with raw_locations_202507, raw_locations_202508, etc.
DO $$
DECLARE
  table_name text;
  table_names text[] := ARRAY[
    'raw_locations_202507', 'raw_locations_202508', 'raw_locations_202509',
    'raw_locations_202510', 'raw_locations_202511', 'raw_locations_202512'
  ];
BEGIN
  FOREACH table_name IN ARRAY table_names
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = table_names) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
      EXECUTE format('CREATE POLICY "users_own_%I" ON public.%I FOR ALL USING (user_id = auth.uid())', table_name, table_name);
    END IF;
  END LOOP;
END $$;

-- Fix 5: Grant proper execute permissions on public functions to prevent access errors
-- Grant execute on key functions that users need access to

GRANT EXECUTE ON FUNCTION public.upsert_presence(double precision, double precision, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_nearby_people(double precision, double precision, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_friendship(uuid, friend_state) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_friend_request(uuid) TO authenticated;

-- Fix 6: Create a UUID validation function to prevent parsing errors
-- This will help catch malformed UUID parameters before they hit the database

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