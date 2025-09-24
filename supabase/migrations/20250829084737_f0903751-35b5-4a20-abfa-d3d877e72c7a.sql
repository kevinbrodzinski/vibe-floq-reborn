-- =====================================
-- PHASE 1: CRITICAL SECURITY FIXES (TARGETED)
-- =====================================

-- Fix 1: Create missing friends view to prevent "public.friends does not exist" errors
CREATE OR REPLACE VIEW public.friends AS
SELECT 
  profile_low as profile_id,
  profile_high as friend_id,
  friend_state,
  created_at,
  responded_at
FROM public.friendships;

-- Fix 2: Enable RLS on critical location tables
-- These contain sensitive user location data without protection

-- Enable RLS on raw_locations_staging 
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'raw_locations_staging' AND table_schema = 'public') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'raw_locations_staging') THEN
      EXECUTE 'ALTER TABLE public.raw_locations_staging ENABLE ROW LEVEL SECURITY';
      EXECUTE 'CREATE POLICY "users_own_staged_locations" ON public.raw_locations_staging FOR ALL USING (profile_id = auth.uid())';
    END IF;
  END IF;
END $$;

-- Enable RLS on venue_stays
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'venue_stays' AND policyname = 'users_own_venue_stays') THEN
    EXECUTE 'ALTER TABLE public.venue_stays ENABLE ROW LEVEL SECURITY';
    EXECUTE 'CREATE POLICY "users_own_venue_stays" ON public.venue_stays FOR ALL USING (profile_id = auth.uid())';
  END IF;
END $$;

-- Fix 3: Create UUID validation function to prevent parsing errors
CREATE OR REPLACE FUNCTION public.validate_uuid_param(input_text text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Remove any trailing query parameters that got concatenated (fixes the UUID,profile_high=eq.UUID error)
  IF position(',' in input_text) > 0 THEN
    input_text := split_part(input_text, ',', 1);
  END IF;
  
  -- Clean up any URL-encoded characters
  input_text := replace(input_text, '%20', '');
  input_text := trim(input_text);
  
  -- Validate and return the UUID
  RETURN input_text::uuid;
EXCEPTION
  WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'Invalid UUID format: %', input_text;
END;
$$;