-- Fix infinite recursion in plan_participants policy
-- The issue is circular dependency between floq_plans and plan_participants policies

-- Drop the problematic policy
DROP POLICY IF EXISTS "plan_participants_read" ON public.plan_participants;

-- Recreate it without referencing floq_plans directly
CREATE POLICY "plan_participants_read" ON public.plan_participants FOR SELECT USING (
  -- Users can see their own participation
  user_id = auth.uid()
  OR
  -- Users can see participants of plans they have access to via direct participation
  EXISTS (
    SELECT 1 FROM public.plan_participants pp2 
    WHERE pp2.plan_id = plan_participants.plan_id 
    AND pp2.user_id = auth.uid()
  )
  OR  
  -- Users can see participants of plans in floqs they belong to (but check floq membership directly)
  EXISTS (
    SELECT 1 FROM public.floq_participants fp
    JOIN public.floq_plans fpl ON fp.floq_id = fpl.floq_id
    WHERE fpl.id = plan_participants.plan_id 
    AND fp.user_id = auth.uid()
  )
);