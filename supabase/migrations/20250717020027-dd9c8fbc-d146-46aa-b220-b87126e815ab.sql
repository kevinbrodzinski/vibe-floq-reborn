-- Fix RLS policy on plan_participants to allow HEAD requests for realtime subscriptions
DROP POLICY IF EXISTS "plan_read" ON public.plan_participants;

CREATE POLICY "plan_read" ON public.plan_participants 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.floq_plans fp
    WHERE fp.id = plan_participants.plan_id 
    AND user_has_plan_access(fp.id)
  )
);