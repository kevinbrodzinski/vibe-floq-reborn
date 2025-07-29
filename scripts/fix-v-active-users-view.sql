-- Fix v_active_users view
-- Project: reztyrrafsmlvvlqvsqt
-- Apply this SQL to production via Supabase Dashboard

-- Step 1: First, get the current view definition
-- Run this to see what the view currently looks like
SELECT 
  view_definition
FROM information_schema.views 
WHERE table_schema = 'public' 
  AND table_name = 'v_active_users';

-- Step 2: Drop the existing view
DROP VIEW IF EXISTS public.v_active_users;

-- Step 3: Recreate the view with profile_id instead of user_id
-- You'll need to replace the view definition below with the actual definition
-- but using profile_id instead of user_id

-- Example view recreation (replace with actual definition):
CREATE OR REPLACE VIEW public.v_active_users AS
SELECT 
  p.id as profile_id,  -- Changed from user_id to profile_id
  p.username,
  p.display_name,
  -- Add other columns as needed
  -- Make sure to reference profile_id instead of user_id
FROM public.profiles p
WHERE p.last_seen_at > NOW() - INTERVAL '24 hours'
  AND p.is_active = true;

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