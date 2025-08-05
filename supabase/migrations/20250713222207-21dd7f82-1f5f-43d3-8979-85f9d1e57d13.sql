-- Add SELECT policy for users to read their own history events
CREATE POLICY "Users can read their own history events"
ON public.flock_history
FOR SELECT
USING (auth.uid() = user_id);

-- Add enhanced INSERT policy allowing system events from edge functions
-- This replaces the previous basic policy with more flexible handling
DROP POLICY IF EXISTS "Users can insert their own history events" ON public.flock_history;

CREATE POLICY "Users can insert history events" 
ON public.flock_history
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id  -- Normal user insert
  OR auth.role() = 'service_role'  -- Service role bypass for system events
  OR (metadata ? 'actor_id' AND auth.uid() = (metadata->>'actor_id')::uuid)  -- Actor matches metadata
);