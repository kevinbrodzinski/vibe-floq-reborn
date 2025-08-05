-- Remove the remaining conflicting SELECT policy on profiles table

-- Drop the "Public profiles read" policy that conflicts with our self-access policies
DROP POLICY IF EXISTS "Public profiles read" ON public.profiles;

-- Now only the granular self-access policies should remain:
-- profiles_self_select, profiles_self_update, profiles_self_insert