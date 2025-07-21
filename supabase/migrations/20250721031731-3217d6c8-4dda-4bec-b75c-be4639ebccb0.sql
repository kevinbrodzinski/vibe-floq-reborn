-- Fix infinite recursion in floq_plans RLS policies
-- Create security definer helper functions to avoid recursion

-- Helper function to check if user can access a plan
CREATE OR REPLACE FUNCTION public.user_can_access_plan(p_plan_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.plan_participants pp
    WHERE pp.plan_id = p_plan_id
      AND pp.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1
    FROM public.floq_plans fp
    WHERE fp.id = p_plan_id
      AND fp.creator_id = auth.uid()
  );
END;
$$;

-- Helper function to check if user can manage a plan (creator or floq admin)
CREATE OR REPLACE FUNCTION public.user_can_manage_plan(p_plan_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  plan_creator_id uuid;
  plan_floq_id uuid;
BEGIN
  -- Get plan details
  SELECT creator_id, floq_id INTO plan_creator_id, plan_floq_id
  FROM public.floq_plans
  WHERE id = p_plan_id;
  
  -- Check if user is creator
  IF plan_creator_id = auth.uid() THEN
    RETURN true;
  END IF;
  
  -- Check if user is floq admin (creator or co-admin)
  IF plan_floq_id IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.floq_participants fp
      WHERE fp.floq_id = plan_floq_id
        AND fp.user_id = auth.uid()
        AND fp.role = ANY (ARRAY['creator'::text, 'co-admin'::text])
    );
  END IF;
  
  RETURN false;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.user_can_access_plan(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_manage_plan(uuid) TO authenticated;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "plan_manage_creator_admin" ON public.floq_plans;
DROP POLICY IF EXISTS "plan_read" ON public.floq_plans;
DROP POLICY IF EXISTS "plan_status_update_creator" ON public.floq_plans;

-- Create new safe policies using helper functions
CREATE POLICY "floq_plans_read_access"
  ON public.floq_plans
  FOR SELECT
  USING (public.user_can_access_plan(id));

CREATE POLICY "floq_plans_manage_access"
  ON public.floq_plans
  FOR ALL
  USING (public.user_can_manage_plan(id))
  WITH CHECK (public.user_can_manage_plan(id));

CREATE POLICY "floq_plans_create_own"
  ON public.floq_plans
  FOR INSERT
  WITH CHECK (creator_id = auth.uid());