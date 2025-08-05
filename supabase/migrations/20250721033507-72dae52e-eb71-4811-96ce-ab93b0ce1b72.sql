-- Fix infinite recursion in floq_plans RLS policies
-- Create security definer functions to avoid recursion

-- 1. Function to check if user can access a plan
CREATE OR REPLACE FUNCTION public.user_can_access_plan(plan_id_param uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.floq_plans fp
    WHERE fp.id = plan_id_param 
    AND fp.creator_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.plan_participants pp
    WHERE pp.plan_id = plan_id_param 
    AND pp.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.floq_plans fp
    JOIN public.floq_participants fpar ON fpar.floq_id = fp.floq_id
    WHERE fp.id = plan_id_param 
    AND fp.floq_id IS NOT NULL
    AND fpar.user_id = auth.uid()
  );
$$;

-- 2. Function to check if user can manage a plan
CREATE OR REPLACE FUNCTION public.user_can_manage_plan(plan_id_param uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.floq_plans fp
    WHERE fp.id = plan_id_param 
    AND fp.creator_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.plan_participants pp
    WHERE pp.plan_id = plan_id_param 
    AND pp.user_id = auth.uid()
  );
$$;

-- 3. Drop existing policies
DROP POLICY IF EXISTS "floq_plans_creator_insert" ON public.floq_plans;
DROP POLICY IF EXISTS "floq_plans_creator_participant_read" ON public.floq_plans;
DROP POLICY IF EXISTS "floq_plans_creator_participant_update" ON public.floq_plans;
DROP POLICY IF EXISTS "floq_plans_creator_participant_delete" ON public.floq_plans;

-- 4. Create new policies using security definer functions
CREATE POLICY "floq_plans_creator_insert"
  ON public.floq_plans
  FOR INSERT
  WITH CHECK (creator_id = auth.uid());

CREATE POLICY "floq_plans_read_access"
  ON public.floq_plans
  FOR SELECT
  USING (user_can_access_plan(id));

CREATE POLICY "floq_plans_manage_access"
  ON public.floq_plans
  FOR UPDATE, DELETE
  USING (user_can_manage_plan(id));

-- 5. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.user_can_access_plan(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_manage_plan(uuid) TO authenticated;