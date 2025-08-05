-- Fix infinite recursion in floq_plans RLS policies
-- Drop existing functions and recreate with security definer

-- 1. Drop existing functions if they exist
DROP FUNCTION IF EXISTS public.user_can_access_plan(uuid);
DROP FUNCTION IF EXISTS public.user_can_manage_plan(uuid);

-- 2. Function to check if user can access a plan (non-recursive)
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

-- 3. Function to check if user can manage a plan (non-recursive)  
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

-- 4. Drop existing policies
DROP POLICY IF EXISTS "floq_plans_creator_insert" ON public.floq_plans;
DROP POLICY IF EXISTS "floq_plans_creator_participant_read" ON public.floq_plans;
DROP POLICY IF EXISTS "floq_plans_creator_participant_update" ON public.floq_plans;
DROP POLICY IF EXISTS "floq_plans_creator_participant_delete" ON public.floq_plans;
DROP POLICY IF EXISTS "floq_plans_read_access" ON public.floq_plans;
DROP POLICY IF EXISTS "floq_plans_manage_access" ON public.floq_plans;
DROP POLICY IF EXISTS "floq_plans_update_access" ON public.floq_plans;
DROP POLICY IF EXISTS "floq_plans_delete_access" ON public.floq_plans;

-- 5. Create new policies using security definer functions
CREATE POLICY "floq_plans_creator_insert"
  ON public.floq_plans
  FOR INSERT
  WITH CHECK (creator_id = auth.uid());

CREATE POLICY "floq_plans_read_access"
  ON public.floq_plans
  FOR SELECT
  USING (user_can_access_plan(id));

CREATE POLICY "floq_plans_update_access"
  ON public.floq_plans
  FOR UPDATE
  USING (user_can_manage_plan(id));

CREATE POLICY "floq_plans_delete_access"
  ON public.floq_plans
  FOR DELETE
  USING (user_can_manage_plan(id));

-- 6. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.user_can_access_plan(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_manage_plan(uuid) TO authenticated;