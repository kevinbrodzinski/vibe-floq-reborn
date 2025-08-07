-- Diagnostic script to check for remaining user_id references
-- Run this to identify any remaining issues after the migration

-- 1. Check for tables with user_id columns (excluding auth schema)
SELECT 
  table_schema,
  table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE column_name = 'user_id' 
AND table_schema NOT IN ('auth', 'information_schema', 'pg_catalog')
ORDER BY table_schema, table_name;

-- 2. Check for functions that still reference user_id in their body
SELECT 
  p.proname as function_name,
  n.nspname as schema_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE pg_get_functiondef(p.oid) ILIKE '%user_id%'
AND n.nspname = 'public'
AND p.prokind = 'f';

-- 3. Check for triggers that reference user_id
SELECT 
  t.trigger_name,
  t.event_object_table,
  t.action_statement,
  p.prosrc as trigger_function_body
FROM information_schema.triggers t
JOIN pg_proc p ON p.proname = replace(t.action_statement, 'EXECUTE FUNCTION ', '')
WHERE p.prosrc ILIKE '%user_id%'
AND t.trigger_schema = 'public';

-- 4. Check for policies that reference user_id
SELECT 
  schemaname,
  tablename,
  policyname,
  qual as policy_condition
FROM pg_policies
WHERE qual ILIKE '%user_id%'
AND schemaname = 'public';

-- 5. Check current structure of vibe-related tables
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name IN ('vibes_now', 'user_vibe_states')
AND table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- 6. Check for any remaining foreign key constraints on user_id
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
AND (kcu.column_name = 'user_id' OR ccu.column_name = 'user_id')
AND tc.table_schema = 'public';

-- 7. Test the set_user_vibe function signatures
SELECT 
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.prorettype::regtype as return_type
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname IN ('set_user_vibe', 'clear_user_vibe')
AND n.nspname = 'public'
ORDER BY p.proname, p.pronargs;