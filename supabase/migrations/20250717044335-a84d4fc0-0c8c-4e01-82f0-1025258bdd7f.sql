-- ════════════════════════════════════════════════════════════════════
--  2025-07-17  📬  FLOQ CHAT – persistent messages table + RLS
-- ════════════════════════════════════════════════════════════════════

-- 0.  Ensure pgcrypto so we can use gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-----------------------------------------------------------------------
-- 1.  Table
-----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.floq_messages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  floq_id    uuid NOT NULL REFERENCES public.floqs (id)
                           ON DELETE CASCADE,

  sender_id  uuid NOT NULL REFERENCES auth.users (id)
                           ON DELETE CASCADE,

  body       text NOT NULL CHECK (char_length(trim(body)) > 0),

  created_at timestamptz NOT NULL DEFAULT now()
);

-- Helpful index for timeline queries: "all messages for this floq ordered newest-first"
CREATE INDEX IF NOT EXISTS idx_floq_messages_floq_id_created_at
  ON public.floq_messages (floq_id, created_at DESC);

-----------------------------------------------------------------------
-- 2.  Row-level security
-----------------------------------------------------------------------
ALTER TABLE public.floq_messages ENABLE ROW LEVEL SECURITY;

-- (adapt table name here if your membership table is `floq_members`)
-- READ
DROP POLICY IF EXISTS "floq messages read" ON public.floq_messages;
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

-- WRITE (insert)
DROP POLICY IF EXISTS "floq messages insert" ON public.floq_messages;
CREATE POLICY "floq messages insert"
  ON public.floq_messages
  FOR INSERT
  WITH CHECK (
      sender_id = auth.uid() AND
      EXISTS (
        SELECT 1
        FROM public.floq_participants fp
        WHERE fp.floq_id = NEW.floq_id
          AND fp.user_id = auth.uid()
      )
  );

-----------------------------------------------------------------------
-- 3.  Optional: let clients call simple helper RPCs
-----------------------------------------------------------------------
-- example RPC to check membership (handy for client code)
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

-----------------------------------------------------------------------
-- 4.  Done
-----------------------------------------------------------------------