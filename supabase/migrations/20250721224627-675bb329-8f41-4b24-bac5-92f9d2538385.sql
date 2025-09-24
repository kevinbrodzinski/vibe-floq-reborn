-- 0. pre-req: uuid-ossp extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Schema changes
ALTER TABLE public.plan_participants
  ADD COLUMN IF NOT EXISTS id uuid DEFAULT uuid_generate_v4(),
  ADD COLUMN IF NOT EXISTS guest_email text,
  ADD COLUMN IF NOT EXISTS guest_phone text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS invited_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS responded_at timestamptz,
  ALTER COLUMN is_guest SET DEFAULT false,
  ALTER COLUMN is_guest SET NOT NULL,
  ALTER COLUMN user_id DROP NOT NULL;

-- 1b. new PK
ALTER TABLE public.plan_participants
  DROP CONSTRAINT IF EXISTS plan_participants_pkey;
ALTER TABLE public.plan_participants
  ADD PRIMARY KEY (id);

-- 2. Check constraint
ALTER TABLE public.plan_participants
  ADD CONSTRAINT check_participant_identity
  CHECK (
    (is_guest = false AND user_id IS NOT NULL)
    OR
    (is_guest = true  AND user_id IS NULL AND guest_name IS NOT NULL)
  );

-- 3. Helpful indexes
CREATE INDEX IF NOT EXISTS idx_pp_plan ON public.plan_participants(plan_id);
CREATE INDEX IF NOT EXISTS idx_pp_user ON public.plan_participants(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pp_guest_email ON public.plan_participants(guest_email) WHERE guest_email IS NOT NULL;

-- 4. Helper functions (non-recursive variant for plan_participants policies)
CREATE OR REPLACE FUNCTION public.user_in_floq_or_creator(p_plan uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SET LOCAL ROLE NONE;
  RETURN EXISTS (
    SELECT 1
    FROM floq_plans fp
    WHERE fp.id = p_plan
      AND (
        fp.creator_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM floq_participants
          WHERE floq_id = fp.floq_id AND user_id = auth.uid()
        )
      )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.user_in_floq_or_creator(uuid) TO authenticated;

-- 5. RLS policies
ALTER TABLE public.plan_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS plan_participants_read_access ON public.plan_participants;
CREATE POLICY plan_participants_read_access
  ON public.plan_participants
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR user_in_floq_or_creator(plan_id)
  );

DROP POLICY IF EXISTS plan_participants_insert_access ON public.plan_participants;
CREATE POLICY plan_participants_insert_access
  ON public.plan_participants
  FOR INSERT
  WITH CHECK (
    (auth.uid() = user_id AND user_in_floq_or_creator(plan_id))
    OR (is_guest = true AND user_in_floq_or_creator(plan_id))
  );

DROP POLICY IF EXISTS plan_participants_update_access ON public.plan_participants;
CREATE POLICY plan_participants_update_access
  ON public.plan_participants
  FOR UPDATE
  USING (
    auth.uid() = user_id
    OR user_in_floq_or_creator(plan_id)
  );

DROP POLICY IF EXISTS plan_participants_delete_access ON public.plan_participants;
CREATE POLICY plan_participants_delete_access
  ON public.plan_participants
  FOR DELETE
  USING (
    auth.uid() = user_id
    OR user_in_floq_or_creator(plan_id)
  );