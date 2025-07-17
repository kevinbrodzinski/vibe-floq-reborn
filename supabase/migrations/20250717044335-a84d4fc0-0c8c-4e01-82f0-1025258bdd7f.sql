-- ════════════════════════════════════════════════════════════════════
--  2025-07-17  🐞  Fix RLS policies for floq_messages (remove NEW)
-- ════════════════════════════════════════════════════════════════════

-- 1. make sure the table exists (no-op if already created)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.floq_messages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  floq_id    uuid NOT NULL REFERENCES public.floqs (id) ON DELETE CASCADE,
  sender_id  uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  body       text NOT NULL CHECK (char_length(trim(body)) > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_floq_messages_floq_id_created_at
  ON public.floq_messages (floq_id, created_at DESC);

ALTER TABLE public.floq_messages ENABLE ROW LEVEL SECURITY;

-- 2. drop the bad policies if they were partially created
DROP POLICY IF EXISTS "floq messages read"   ON public.floq_messages;
DROP POLICY IF EXISTS "floq messages insert" ON public.floq_messages;

-- 3. recreate with correct row references
-----------------------------------------------------------------------
-- READ: any member of the floq can SELECT / realtime‐subscribe
-----------------------------------------------------------------------
CREATE POLICY "floq messages read"
  ON public.floq_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.floq_participants fp
      WHERE fp.floq_id = floq_messages.floq_id
        AND fp.user_id = auth.uid()
    )
  );

-----------------------------------------------------------------------
-- INSERT: sender must be auth.uid() *and* already a member of the floq
-----------------------------------------------------------------------
CREATE POLICY "floq messages insert"
  ON public.floq_messages
  FOR INSERT
  WITH CHECK (
      sender_id = auth.uid()
      AND EXISTS (
        SELECT 1
        FROM public.floq_participants fp
        WHERE fp.floq_id = floq_messages.floq_id
          AND fp.user_id = auth.uid()
      )
  );

-- 4. (optional helper) keep the function if you like
CREATE OR REPLACE FUNCTION public.user_in_floq(p_floq uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path=public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.floq_participants
    WHERE floq_id = p_floq AND user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.user_in_floq(uuid) TO authenticated;