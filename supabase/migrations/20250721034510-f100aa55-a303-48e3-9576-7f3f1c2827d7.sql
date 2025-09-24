-- Fix infinite recursion in plan_participants RLS policy
-- Replace self-referencing policy with security definer helper function

-- 1. Drop the problematic self-referencing policy
DROP POLICY IF EXISTS "pp_participants_can_see_others" ON public.plan_participants;

-- 2. Create security definer helper function to check plan participation
CREATE OR REPLACE FUNCTION public.user_is_plan_participant(p_plan_id uuid)
RETURNS boolean
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.plan_participants 
    WHERE plan_id = p_plan_id 
    AND user_id = auth.uid()
  );
END;
$$;

-- 3. Create new policy using the helper function (no self-reference)
CREATE POLICY "pp_participants_can_see_others"
  ON public.plan_participants
  FOR SELECT
  USING (public.user_is_plan_participant(plan_participants.plan_id));

-- 4. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.user_is_plan_participant(uuid) TO authenticated;