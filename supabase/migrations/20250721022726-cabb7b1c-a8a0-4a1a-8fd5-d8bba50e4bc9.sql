
-- Make floq_id nullable to allow solo plans
ALTER TABLE public.floq_plans 
ALTER COLUMN floq_id DROP NOT NULL;

-- Update RLS policies to handle both cases
DROP POLICY IF EXISTS "plan_read" ON public.floq_plans;
CREATE POLICY "plan_read" ON public.floq_plans FOR SELECT USING (
  -- Plan creator can always see their plans
  creator_id = auth.uid()
  OR
  -- Plan participants can see plans they're part of
  EXISTS (
    SELECT 1 FROM public.plan_participants pp
    WHERE pp.plan_id = floq_plans.id AND pp.user_id = auth.uid()
  )
  OR
  -- Floq members can see plans linked to their floq
  (floq_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.floq_participants fp
    WHERE fp.floq_id = floq_plans.floq_id AND fp.user_id = auth.uid()
  ))
);

-- Update other policies to handle nullable floq_id
DROP POLICY IF EXISTS "plan_manage_creator_admin" ON public.floq_plans;
CREATE POLICY "plan_manage_creator_admin" ON public.floq_plans FOR ALL USING (
  -- Plan creator can manage their plans
  creator_id = auth.uid()
  OR
  -- Floq admins can manage plans linked to their floq
  (floq_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.floq_participants p
    WHERE p.floq_id = floq_plans.floq_id 
    AND p.user_id = auth.uid() 
    AND p.role IN ('creator', 'co-admin')
  ))
) WITH CHECK (
  -- Same conditions for inserts/updates
  creator_id = auth.uid()
  OR
  (floq_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.floq_participants p
    WHERE p.floq_id = floq_plans.floq_id 
    AND p.user_id = auth.uid() 
    AND p.role IN ('creator', 'co-admin')
  ))
);

-- Add index for performance on floq_id queries
CREATE INDEX IF NOT EXISTS idx_floq_plans_floq_id_null 
ON public.floq_plans(floq_id) WHERE floq_id IS NOT NULL;

-- Add index for plan participants lookup
CREATE INDEX IF NOT EXISTS idx_floq_plans_creator_status 
ON public.floq_plans(creator_id, status);
