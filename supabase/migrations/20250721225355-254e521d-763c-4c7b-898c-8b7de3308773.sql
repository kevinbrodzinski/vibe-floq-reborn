-- Fix critical issues with plan_participants table

-- 1. Ensure is_guest is NOT NULL (we already have the column, just need to ensure constraint)
UPDATE public.plan_participants 
SET is_guest = false 
WHERE is_guest IS NULL;

ALTER TABLE public.plan_participants 
  ALTER COLUMN is_guest SET NOT NULL,
  ALTER COLUMN is_guest SET DEFAULT false;

-- 2. Create non-recursive helper for plan_participants RLS policies
CREATE OR REPLACE FUNCTION public.user_can_access_plan_simple(p_plan uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SET LOCAL ROLE NONE;
  -- This version doesn't check plan_participants to avoid recursion
  RETURN EXISTS (
    SELECT 1
    FROM floq_plans fp
    JOIN floq_participants fpar ON fpar.floq_id = fp.floq_id
    WHERE fp.id = p_plan
      AND (fp.creator_id = auth.uid() OR fpar.user_id = auth.uid())
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.user_can_access_plan_simple(uuid) TO authenticated;

-- 3. Update plan_participants RLS policies to use the non-recursive helper
DROP POLICY IF EXISTS plan_participants_read_access ON public.plan_participants;
CREATE POLICY plan_participants_read_access
  ON public.plan_participants
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR user_can_access_plan_simple(plan_id)
  );

DROP POLICY IF EXISTS plan_participants_insert_access ON public.plan_participants;
CREATE POLICY plan_participants_insert_access
  ON public.plan_participants
  FOR INSERT
  WITH CHECK (
    (auth.uid() = user_id AND user_can_access_plan_simple(plan_id))
    OR (is_guest = true AND user_can_access_plan_simple(plan_id))
  );

DROP POLICY IF EXISTS plan_participants_update_access ON public.plan_participants;
CREATE POLICY plan_participants_update_access
  ON public.plan_participants
  FOR UPDATE
  USING (
    auth.uid() = user_id
    OR user_can_access_plan_simple(plan_id)
  );

DROP POLICY IF EXISTS plan_participants_delete_access ON public.plan_participants;
CREATE POLICY plan_participants_delete_access
  ON public.plan_participants
  FOR DELETE
  USING (
    auth.uid() = user_id
    OR user_can_access_plan_simple(plan_id)
  );

-- 4. Add missing index for guest_email
CREATE INDEX IF NOT EXISTS idx_pp_guest_email ON public.plan_participants(guest_email) 
WHERE guest_email IS NOT NULL;

-- 5. Update check constraint to handle NOT NULL is_guest
ALTER TABLE public.plan_participants
  DROP CONSTRAINT IF EXISTS check_participant_identity;

ALTER TABLE public.plan_participants
  ADD CONSTRAINT check_participant_identity
  CHECK (
    (is_guest = false AND user_id IS NOT NULL)
    OR
    (is_guest = true AND user_id IS NULL AND guest_name IS NOT NULL)
  );