-- Fix v_active_users view with correct structure
-- Project: reztyrrafsmlvvlqvsqt
-- Apply this SQL to production via Supabase Dashboard

-- Step 1: Drop the existing view
DROP VIEW IF EXISTS public.v_active_users;

-- Step 2: Drop user_id from vibes_now table (since it has profile_id)
ALTER TABLE public.vibes_now DROP COLUMN IF EXISTS user_id;

-- Step 3: Recreate the view with the correct structure
-- Based on the original view definition, but using profile_id instead of user_id
CREATE OR REPLACE VIEW public.v_active_users AS
SELECT 
  profile_id,  -- Changed from user_id to profile_id
  st_y((location)::geometry) AS lat,
  st_x((location)::geometry) AS lng,
  vibe,
  updated_at
FROM vibes_now vn
WHERE (expires_at > now()) AND (visibility = 'public'::text);

-- Step 4: Verify the view was recreated correctly
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'v_active_users';

-- Step 5: Check the view structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'v_active_users'
ORDER BY ordinal_position;

-- Step 6: Test the view
SELECT COUNT(*) as active_users_count FROM public.v_active_users; 