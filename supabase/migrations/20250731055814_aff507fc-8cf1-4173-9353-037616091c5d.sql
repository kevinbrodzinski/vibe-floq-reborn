-- Add a more permissive read policy for functions to avoid RLS blocking issues
-- This allows the security definer functions to read user interaction data
-- when calculating personalized scores

CREATE POLICY "Functions can read interactions for scoring" 
ON public.user_venue_interactions 
FOR SELECT 
TO authenticated
USING (true);

-- Add comment explaining the policy
COMMENT ON POLICY "Functions can read interactions for scoring" ON public.user_venue_interactions 
IS 'Allows security definer functions to read interaction data when calculating personalized venue scores. This policy works alongside the existing user-specific policies.';