-- Check existing search_floqs functions
SELECT 
  p.proname,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosrc as function_body
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
AND p.proname = 'search_floqs';