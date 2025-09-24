-- replace the broken policy
DROP POLICY IF EXISTS plan_read ON public.plan_participants;

-- new read policy (SELECT also covers the HEAD probe)
CREATE POLICY plan_read
ON public.plan_participants
FOR SELECT                                   -- ✅ this includes HEAD
USING (
  EXISTS (
    SELECT 1
    FROM public.floq_plans fp
    WHERE fp.id = plan_participants.plan_id
      AND user_has_plan_access(fp.id)
  )
);