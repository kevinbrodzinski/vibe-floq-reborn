-- Migrate v_active_users view
-- Project: reztyrrafsmlvvlqvsqt
-- Apply this SQL to production via Supabase Dashboard

-- Step 1: First, get the current view definition
SELECT 
  view_definition
FROM information_schema.views 
WHERE table_schema = 'public' 
  AND table_name = 'v_active_users';

-- Step 2: Drop the existing view
DROP VIEW IF EXISTS public.v_active_users;

-- Step 3: Drop user_id from vibes_now table (since it has profile_id)
ALTER TABLE public.vibes_now DROP COLUMN IF EXISTS user_id;

-- Step 4: Recreate the view with profile_id
-- The view will now use profile_id from vibes_now instead of user_id
CREATE OR REPLACE VIEW public.v_active_users AS
SELECT DISTINCT
  vn.profile_id,  -- Changed from user_id to profile_id
  p.username,
  p.display_name,
  p.avatar_url,
  vn.created_at,
  vn.updated_at
FROM public.vibes_now vn
JOIN public.profiles p ON p.id = vn.profile_id
WHERE vn.created_at > NOW() - INTERVAL '24 hours'
  AND p.is_active = true;

-- Step 5: Verify the view was recreated correctly
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'v_active_users';

-- Step 6: Check the view structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'v_active_users'
ORDER BY ordinal_position;

-- Step 7: Test the view
SELECT COUNT(*) as active_users_count FROM public.v_active_users; 