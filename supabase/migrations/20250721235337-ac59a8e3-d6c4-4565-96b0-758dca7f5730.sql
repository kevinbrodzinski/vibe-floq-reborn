BEGIN;

------------------------------------------------------------
-- 1. Secure floq_plans (was rls_enabled = false)
------------------------------------------------------------
ALTER TABLE public.floq_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fp_read ON public.floq_plans;

CREATE POLICY fp_read
ON public.floq_plans
FOR SELECT
USING (
      creator_id = auth.uid()
   OR EXISTS (
        SELECT 1
        FROM public.floq_participants
        WHERE floq_participants.floq_id = floq_plans.floq_id
          AND floq_participants.user_id = auth.uid()
      )
);

------------------------------------------------------------
-- 2. De-loop plan_participants
------------------------------------------------------------
ALTER TABLE public.plan_participants ENABLE ROW LEVEL SECURITY;

-- remove every old self-referencing policy
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'plan_participants'
  LOOP
     EXECUTE format('DROP POLICY IF EXISTS %I ON public.plan_participants;', pol.policyname);
  END LOOP;
END$$;

-- single, recursion-free policy
CREATE POLICY pp_read
ON public.plan_participants
FOR SELECT
USING (
      -- your own row
      auth.uid() = user_id

   OR -- plan creator
      auth.uid() = (
        SELECT creator_id FROM public.floq_plans WHERE id = plan_id
      )

   OR -- member of the floq that owns the plan
      EXISTS (
        SELECT 1
        FROM public.floq_participants fp
        JOIN public.floq_plans       p ON p.floq_id = fp.floq_id
        WHERE p.id = plan_id
          AND fp.user_id = auth.uid()
      )
);

COMMIT;