-- Add missing INSERT policy for plan_participants
-- This allows authenticated users to join plans
CREATE POLICY "plan_participants_insert" 
ON public.plan_participants
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());