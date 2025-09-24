BEGIN;

/* --------------------------------------------------------------
   Ensure FK + RLS let any member send/see messages in their floq
--------------------------------------------------------------- */

/* 1️⃣  FK: profile_id → profiles.id */
ALTER TABLE public.floq_messages
  DROP CONSTRAINT IF EXISTS floq_messages_profile_id_fkey;
ALTER TABLE public.floq_messages
  ADD CONSTRAINT floq_messages_profile_id_fkey
  FOREIGN KEY (profile_id)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;

/* 2️⃣  Enable RLS */
ALTER TABLE public.floq_messages ENABLE ROW LEVEL SECURITY;

/* 3️⃣  SELECT policy: you can read msgs inside floqs you belong to */
DROP POLICY IF EXISTS floq_messages_select ON public.floq_messages;
CREATE POLICY floq_messages_select
  ON public.floq_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.floq_participants fp
      WHERE fp.floq_id   = floq_messages.floq_id
        AND fp.profile_id = auth.uid()
    )
  );

/* 4️⃣  INSERT policy: any member may post */
DROP POLICY IF EXISTS floq_messages_insert ON public.floq_messages;
CREATE POLICY floq_messages_insert
  ON public.floq_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.floq_participants fp
      WHERE fp.floq_id   = floq_messages.floq_id
        AND fp.profile_id = auth.uid()
    )
  );

/* 5️⃣  UPDATE policy: only sender can edit their own messages */
DROP POLICY IF EXISTS floq_messages_update ON public.floq_messages;
CREATE POLICY floq_messages_update
  ON public.floq_messages
  FOR UPDATE
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

/* 6️⃣  DELETE policy: only sender can delete their own messages */
DROP POLICY IF EXISTS floq_messages_delete ON public.floq_messages;
CREATE POLICY floq_messages_delete
  ON public.floq_messages
  FOR DELETE
  USING (profile_id = auth.uid());

COMMIT;