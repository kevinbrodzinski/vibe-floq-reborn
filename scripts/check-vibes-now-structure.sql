-- Check vibes_now table structure
-- Project: reztyrrafsmlvvlqvsqt
-- Apply this SQL to production via Supabase Dashboard

-- Step 1: Check the actual columns in vibes_now
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'vibes_now'
ORDER BY ordinal_position;

-- Step 2: Check the actual columns in profiles
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Step 3: Get the original view definition to see what it was selecting
SELECT 
  view_definition
FROM information_schema.views 
WHERE table_schema = 'public' 
  AND table_name = 'v_active_users'; 