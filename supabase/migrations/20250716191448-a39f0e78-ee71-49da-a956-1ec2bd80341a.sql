BEGIN;

-- Enable RLS (harmless if already enabled)
ALTER TABLE public.floq_plans ENABLE ROW LEVEL SECURITY;

-- Grant UPDATE privilege to authenticated users
GRANT UPDATE ON public.floq_plans TO authenticated;

-- Creator update policy
DROP POLICY IF EXISTS plan_status_update_creator ON public.floq_plans;
CREATE POLICY plan_status_update_creator
ON public.floq_plans
FOR UPDATE
USING (creator_id = auth.uid())
WITH CHECK (creator_id = auth.uid());

COMMIT;