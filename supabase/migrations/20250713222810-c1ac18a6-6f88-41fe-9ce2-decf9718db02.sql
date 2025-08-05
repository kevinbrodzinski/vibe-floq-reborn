-- Add SELECT policy for flock_history so users can read their own events
CREATE POLICY "Users can read their own flock history events" 
ON public.flock_history 
FOR SELECT 
USING (auth.uid() = user_id);