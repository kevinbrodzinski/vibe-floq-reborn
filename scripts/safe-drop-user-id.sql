-- Safe Drop user_id Columns Script
-- Project: reztyrrafsmlvvlqvsqt
-- Apply this SQL to production via Supabase Dashboard

-- WARNING: This script will permanently remove user_id columns
-- Only run this after confirming all tables have profile_id columns

-- Step 1: First, check which tables have both user_id and profile_id
-- Run this query first to see the current state
SELECT 
  t.table_name,
  COUNT(CASE WHEN c.column_name = 'user_id' THEN 1 END) as has_user_id,
  COUNT(CASE WHEN c.column_name = 'profile_id' THEN 1 END) as has_profile_id
FROM information_schema.tables t
LEFT JOIN information_schema.columns c ON t.table_name = c.table_name 
  AND c.table_schema = 'public'
  AND c.column_name IN ('user_id', 'profile_id')
WHERE t.table_schema = 'public' 
  AND t.table_type = 'BASE TABLE'
GROUP BY t.table_name
HAVING COUNT(CASE WHEN c.column_name = 'user_id' THEN 1 END) > 0
   OR COUNT(CASE WHEN c.column_name = 'profile_id' THEN 1 END) > 0
ORDER BY t.table_name;

-- Step 2: Check for foreign key constraints on user_id columns
-- Run this to see what constraints need to be dropped first
SELECT 
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'
  AND kcu.column_name = 'user_id';

-- Step 3: Drop foreign key constraints first (if any)
-- Uncomment and run these if foreign key constraints exist
-- ALTER TABLE public.table_name DROP CONSTRAINT IF EXISTS constraint_name;

-- Step 4: Drop user_id columns from tables that have profile_id
-- Only uncomment the lines for tables that actually have profile_id columns

-- Example for a table that has both columns:
-- ALTER TABLE public.profiles DROP COLUMN IF EXISTS user_id;

-- Step 5: Update any functions that reference user_id
-- This needs to be done manually based on your specific functions

-- Example function update:
-- CREATE OR REPLACE FUNCTION public.tg_plan_comment_before()
-- RETURNS TRIGGER
-- LANGUAGE plpgsql
-- SET search_path TO 'public'
-- AS $$
-- BEGIN
--   NEW.updated_at := now();
--   
--   -- Update to use profile_id instead of user_id
--   NEW.mentioned_users :=
--     (
--       SELECT COALESCE(array_agg(p.id), '{}'::uuid[])
--       FROM regexp_matches(NEW.content, '@([A-Za-z0-9_]{3,30})', 'g') AS m(handle TEXT)
--       JOIN public.profiles p ON p.username = m.handle
--     );
--   
--   RETURN NEW;
-- END;
-- $$;

-- Step 6: Update RLS policies that reference user_id
-- This needs to be done manually based on your specific policies

-- Example RLS policy update:
-- DROP POLICY IF EXISTS "example_policy" ON public.example_table;
-- CREATE POLICY "example_policy" ON public.example_table
--   FOR SELECT USING (profile_id = auth.uid());

-- Step 7: Verify all user_id columns have been removed
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

-- Step 8: Check for any remaining references to user_id in functions
-- Run this to find any remaining function references
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_definition LIKE '%user_id%'
ORDER BY routine_name; 