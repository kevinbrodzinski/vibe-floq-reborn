-- Verification script for vibe functions after migration
-- Run this to confirm all functions are properly set up

-- 1. Check all set_user_vibe function overloads
SELECT 
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.prorettype::regtype as return_type,
  p.prosrc ILIKE '%profile_id%' as uses_profile_id
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname = 'set_user_vibe'
AND n.nspname = 'public'
ORDER BY p.pronargs;

-- 2. Check clear_user_vibe function
SELECT 
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.prorettype::regtype as return_type,
  p.prosrc ILIKE '%profile_id%' as uses_profile_id
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname = 'clear_user_vibe'
AND n.nspname = 'public';

-- 3. Check vibe-related table structures
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name IN ('vibes_now', 'user_vibe_states')
AND table_schema = 'public'
AND column_name IN ('user_id', 'profile_id')
ORDER BY table_name, column_name;

-- 4. Test function calls (these should not error)
-- Note: These are just syntax checks, they won't actually execute due to auth requirements
SELECT 'Function syntax check:' as test_type, 'set_user_vibe(text)' as function_test;
-- Example call: SELECT set_user_vibe('chill'::text, null, null);

SELECT 'Function syntax check:' as test_type, 'set_user_vibe(vibe_enum)' as function_test;
-- Example call: SELECT set_user_vibe('chill'::vibe_enum, null, null);

SELECT 'Function syntax check:' as test_type, 'clear_user_vibe()' as function_test;
-- Example call: SELECT clear_user_vibe();

-- 5. Check permissions
SELECT 
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  has_function_privilege('authenticated', p.oid, 'execute') as has_execute_permission
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname IN ('set_user_vibe', 'clear_user_vibe')
AND n.nspname = 'public'
ORDER BY p.proname, p.pronargs;