-- Remove conflicting RLS policy that's causing profile queries to fail

-- Drop the old ALL operations policy that conflicts with our granular policies
DROP POLICY IF EXISTS "Profiles: self access" ON public.profiles;

-- The specific granular policies (profiles_self_select, profiles_self_update, profiles_self_insert) 
-- should remain and work correctly now without the conflicting ALL policy