-- Check v_active_users view structure
-- Project: reztyrrafsmlvvlqvsqt
-- Apply this SQL to production via Supabase Dashboard

-- Step 1: Check if v_active_users is a view
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'v_active_users';

-- Step 2: Get the view definition
SELECT 
  view_definition
FROM information_schema.views 
WHERE table_schema = 'public' 
  AND table_name = 'v_active_users';

-- Step 3: Check what tables the view references
SELECT 
  dependent_ns.nspname as dependent_schema,
  dependent_view.relname as dependent_object,
  pg_class.relname as referenced_object,
  pg_namespace.nspname as referenced_schema
FROM pg_depend 
JOIN pg_rewrite ON pg_depend.objid = pg_rewrite.oid 
JOIN pg_class as dependent_view ON pg_rewrite.ev_class = dependent_view.oid 
JOIN pg_class ON pg_depend.refobjid = pg_class.oid 
JOIN pg_namespace ON pg_class.relnamespace = pg_namespace.oid 
JOIN pg_namespace dependent_ns ON dependent_view.relnamespace = dependent_ns.oid 
WHERE dependent_view.relname = 'v_active_users'
  AND dependent_ns.nspname = 'public'; 