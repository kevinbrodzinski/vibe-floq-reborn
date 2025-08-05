-- Check for dependencies on user_id columns
-- Project: reztyrrafsmlvvlqvsqt
-- Apply this SQL to production via Supabase Dashboard

-- Step 1: Find all views and materialized views that depend on user_id columns
SELECT 
  dependent_ns.nspname as dependent_schema,
  dependent_view.relname as dependent_object,
  pg_class.relname as referenced_object,
  pg_namespace.nspname as referenced_schema,
  pg_class.relkind as object_type
FROM pg_depend 
JOIN pg_rewrite ON pg_depend.objid = pg_rewrite.oid 
JOIN pg_class as dependent_view ON pg_rewrite.ev_class = dependent_view.oid 
JOIN pg_class ON pg_depend.refobjid = pg_class.oid 
JOIN pg_namespace ON pg_class.relnamespace = pg_namespace.oid 
JOIN pg_namespace dependent_ns ON dependent_view.relnamespace = dependent_ns.oid 
WHERE dependent_ns.nspname = 'public'
  AND pg_namespace.nspname = 'public'
  AND pg_class.relname IN (
    SELECT table_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND column_name = 'user_id'
  )
ORDER BY dependent_view.relname;

-- Step 2: Find all functions that reference user_id
SELECT 
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_definition LIKE '%user_id%'
ORDER BY routine_name;

-- Step 3: Find all triggers that might reference user_id
SELECT 
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
  AND action_statement LIKE '%user_id%'
ORDER BY event_object_table, trigger_name;

-- Step 4: Find all RLS policies that reference user_id
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