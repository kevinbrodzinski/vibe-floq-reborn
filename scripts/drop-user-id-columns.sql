-- SQL Script to Drop user_id Columns from Tables with profile_id
-- Project: reztyrrafsmlvvlqvsqt
-- Apply this SQL to production via Supabase Dashboard

-- WARNING: This script will permanently remove user_id columns
-- Make sure all tables have profile_id columns before running this

-- Step 1: Check which tables have both user_id and profile_id
-- Run this first to verify the current state
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN (
    SELECT DISTINCT table_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND column_name IN ('user_id', 'profile_id')
  )
  AND column_name IN ('user_id', 'profile_id')
ORDER BY table_name, column_name;

-- Step 2: Drop user_id columns from tables that have profile_id
-- Only run this after confirming the tables have profile_id

-- Profiles table (if it has both columns)
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS user_id;

-- User preferences table (if it exists)
-- ALTER TABLE public.user_preferences DROP COLUMN IF EXISTS user_id;

-- User settings table (if it exists)
-- ALTER TABLE public.user_settings DROP COLUMN IF EXISTS user_id;

-- User notifications table (if it exists)
-- ALTER TABLE public.user_notifications DROP COLUMN IF EXISTS user_id;

-- User activity table (if it exists)
-- ALTER TABLE public.user_activity DROP COLUMN IF EXISTS user_id;

-- User achievements table (if it exists)
-- ALTER TABLE public.user_achievements DROP COLUMN IF EXISTS user_id;

-- User badges table (if it exists)
-- ALTER TABLE public.user_badges DROP COLUMN IF EXISTS user_id;

-- User stats table (if it exists)
-- ALTER TABLE public.user_stats DROP COLUMN IF EXISTS user_id;

-- User preferences table (if it exists)
-- ALTER TABLE public.user_preferences DROP COLUMN IF EXISTS user_id;

-- User profile extensions table (if it exists)
-- ALTER TABLE public.user_profile_extensions DROP COLUMN IF EXISTS user_id;

-- Step 3: Update any remaining references in functions or triggers
-- This will need to be done manually based on your specific functions

-- Example: Update function that references user_id
-- CREATE OR REPLACE FUNCTION example_function()
-- RETURNS TRIGGER
-- LANGUAGE plpgsql
-- AS $$
-- BEGIN
--   -- Change user_id references to profile_id
--   INSERT INTO some_table (profile_id, ...)
--   VALUES (NEW.profile_id, ...);
--   RETURN NEW;
-- END;
-- $$;

-- Step 4: Update RLS policies that reference user_id
-- This will need to be done manually based on your specific policies

-- Example: Update RLS policy
-- DROP POLICY IF EXISTS "example_policy" ON public.example_table;
-- CREATE POLICY "example_policy" ON public.example_table
--   FOR SELECT USING (profile_id = auth.uid());

-- Step 5: Verify the changes
-- Run this after making changes to verify
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND column_name = 'user_id'
ORDER BY table_name;

-- If the above query returns no results, all user_id columns have been successfully removed 