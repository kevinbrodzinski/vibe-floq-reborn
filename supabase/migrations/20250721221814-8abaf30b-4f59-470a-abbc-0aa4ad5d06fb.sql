-- Fix infinite recursion in plan_participants RLS policy
-- Replace self-referencing policy with security definer helper function

-- 1. Drop the problematic recursive policy first
DROP POLICY IF EXISTS "pp_participants_can_see_others" ON public.plan_participants;

-- 2. Clean up any previous helper function (now safe to drop)
DROP FUNCTION IF EXISTS public.user_is_plan_participant(uuid);

-- 3. Create new helper: STABLE + PARALLEL SAFE for planner & index use
CREATE OR REPLACE FUNCTION public.user_is_plan_participant(p_plan_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
PARALLEL SAFE
SECURITY DEFINER
SET search_path = public   -- hard-pin to public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.plan_participants
    WHERE plan_id = p_plan_id
      AND user_id = auth.uid()
  );
END;
$$;

-- 4. Create new non-recursive SELECT policy
CREATE POLICY "pp_participants_can_see_others"
ON public.plan_participants
FOR SELECT
USING ( public.user_is_plan_participant(plan_participants.plan_id) );

-- 5. Ensure other existing policies remain intact for plan creators
DROP POLICY IF EXISTS "pp_creator_can_see_all" ON public.plan_participants;

CREATE POLICY "pp_creator_can_see_all"
ON public.plan_participants
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.floq_plans fp
    WHERE fp.id = plan_participants.plan_id
      AND fp.creator_id = auth.uid()
  )
);

-- 6. Self-access policy (users can always see their own participation)
DROP POLICY IF EXISTS "pp_self_access" ON public.plan_participants;

CREATE POLICY "pp_self_access"
ON public.plan_participants
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 7. Grants
GRANT EXECUTE ON FUNCTION public.user_is_plan_participant(uuid) TO authenticated, service_role;