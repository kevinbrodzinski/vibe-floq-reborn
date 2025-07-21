
-- Comprehensive fix for plan_participants RLS infinite recursion
-- This migration completely cleans up all conflicting policies and creates a simple, clean set

-- 1. Drop ALL existing policies on plan_participants to start fresh
DROP POLICY IF EXISTS "plan_participants_insert" ON public.plan_participants;
DROP POLICY IF EXISTS "plan_participants_read" ON public.plan_participants;
DROP POLICY IF EXISTS "plan_participants_select" ON public.plan_participants;
DROP POLICY IF EXISTS "plan_read" ON public.plan_participants;
DROP POLICY IF EXISTS "pp_participants_can_see_others" ON public.plan_participants;
DROP POLICY IF EXISTS "pp_self_rw" ON public.plan_participants;

-- 2. Drop and recreate the helper function to ensure it's clean
DROP FUNCTION IF EXISTS public.user_is_plan_participant(uuid);

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

-- 3. Create three clean, non-overlapping policies

-- Policy 1: Users can insert themselves into plans they have access to
CREATE POLICY "pp_users_can_join"
  ON public.plan_participants
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid() 
    AND EXISTS (
      SELECT 1 FROM public.floq_plans fp
      WHERE fp.id = plan_participants.plan_id
      AND (
        fp.creator_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.floq_participants fpar
          WHERE fpar.floq_id = fp.floq_id 
          AND fpar.user_id = auth.uid()
        )
      )
    )
  );

-- Policy 2: Users can see participants in plans they have access to (using helper function)
CREATE POLICY "pp_users_can_see_participants"
  ON public.plan_participants
  FOR SELECT
  USING (
    public.user_is_plan_participant(plan_participants.plan_id)
    OR EXISTS (
      SELECT 1 FROM public.floq_plans fp
      WHERE fp.id = plan_participants.plan_id
      AND fp.creator_id = auth.uid()
    )
  );

-- Policy 3: Users can update/delete their own participation records
CREATE POLICY "pp_users_manage_own"
  ON public.plan_participants
  FOR UPDATE, DELETE
  USING (user_id = auth.uid());

-- 4. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.user_is_plan_participant(uuid) TO authenticated;

-- 5. Ensure plan_participants has proper constraints
ALTER TABLE public.plan_participants 
  ADD CONSTRAINT IF NOT EXISTS plan_participants_pkey 
  PRIMARY KEY (plan_id, user_id);

-- 6. Add helpful indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_plan_participants_user_id 
  ON public.plan_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_participants_plan_id 
  ON public.plan_participants(plan_id);
