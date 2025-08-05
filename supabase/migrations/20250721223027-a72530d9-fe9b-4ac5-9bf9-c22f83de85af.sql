-- Update plan access control functions to match exact schema
-- Drop existing functions first
DROP FUNCTION IF EXISTS public.user_can_access_plan(uuid);
DROP FUNCTION IF EXISTS public.user_can_manage_plan(uuid);

-- 🔒 Helper: can the current user *view* the plan?
CREATE OR REPLACE FUNCTION public.user_can_access_plan(p_plan_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.floq_plans fp
    WHERE fp.id = p_plan_id
      AND (
        fp.creator_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.plan_participants pp
          WHERE pp.plan_id = p_plan_id
            AND pp.user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1
          FROM public.floq_participants fpar
          WHERE fpar.floq_id = fp.floq_id
            AND fpar.user_id = auth.uid()
        )
      )
  );
END;
$$;

-- 🔒 Helper: can the current user *manage* the plan?
CREATE OR REPLACE FUNCTION public.user_can_manage_plan(p_plan_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.floq_plans fp
    WHERE fp.id = p_plan_id
      AND (
        fp.creator_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.floq_participants fpar
          WHERE fpar.floq_id = fp.floq_id
            AND fpar.user_id = auth.uid()
            AND fpar.role IN ('creator','co-admin') -- adjust to match enum values
        )
      )
  );
END;
$$;

-- 🔐 Permissions
GRANT EXECUTE ON FUNCTION public.user_can_access_plan(uuid)  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_can_manage_plan(uuid)  TO authenticated, service_role;

-- 📈 Performance indexes
CREATE INDEX IF NOT EXISTS idx_plan_participants_pid_uid
  ON public.plan_participants(plan_id, user_id);

CREATE INDEX IF NOT EXISTS idx_floq_participants_fid_uid
  ON public.floq_participants(floq_id, user_id);