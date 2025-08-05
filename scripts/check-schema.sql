-- Check Database Schema for user_id and profile_id columns
-- Run this in your Supabase Dashboard SQL Editor
-- Project: reztyrrafsmlvvlqvsqt

-- Step 1: Check which tables have user_id or profile_id columns
SELECT 
  t.table_name,
  COUNT(CASE WHEN c.column_name = 'user_id' THEN 1 END) as has_user_id,
  COUNT(CASE WHEN c.column_name = 'profile_id' THEN 1 END) as has_profile_id,
  COUNT(CASE WHEN c.column_name = 'user_id' AND c.column_name = 'profile_id' THEN 1 END) as has_both
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

-- Step 2: List all tables with user_id columns
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND column_name = 'user_id'
ORDER BY table_name;

-- Step 3: List all tables with profile_id columns
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND column_name = 'profile_id'
ORDER BY table_name;

-- Step 4: Check for foreign key constraints on user_id columns
SELECT 
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  tc.constraint_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'
  AND kcu.column_name = 'user_id'
ORDER BY tc.table_name;

-- Step 5: Check for indexes on user_id columns
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexdef LIKE '%user_id%'
ORDER BY tablename, indexname;

-- Step 6: Check for RLS policies that reference user_id
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND (qual LIKE '%user_id%' OR with_check LIKE '%user_id%')
ORDER BY tablename, policyname;

-- Step 7: Check for functions that reference user_id
SELECT 
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_definition LIKE '%user_id%'
ORDER BY routine_name; 