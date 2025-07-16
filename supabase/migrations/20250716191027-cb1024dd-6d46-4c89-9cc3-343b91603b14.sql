-- Ensure RLS is active
ALTER TABLE public.floq_plans ENABLE ROW LEVEL SECURITY;

-- Drop any old policy with the same name to avoid conflicts
DROP POLICY IF EXISTS plan_status_update_creator ON public.floq_plans;

-- Allow the plan creator to update (incl. status changes)
CREATE POLICY plan_status_update_creator
ON public.floq_plans
FOR UPDATE
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());