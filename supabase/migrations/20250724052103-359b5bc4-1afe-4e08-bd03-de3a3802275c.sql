-- Add unique index for plan_floqs table
CREATE UNIQUE INDEX IF NOT EXISTS uniq_plan_floq 
  ON public.plan_floqs(floq_id, plan_id);