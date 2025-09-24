BEGIN;

/* ────────────────────────────────────────────────────────────────
   1.  F L O Q  table  (read / manage)
──────────────────────────────────────────────────────────────── */

ALTER TABLE public.floqs ENABLE ROW LEVEL SECURITY;

/* Public or creator can read */
DROP POLICY IF EXISTS floqs_public_read ON public.floqs;
CREATE POLICY floqs_public_read
  ON public.floqs
  FOR SELECT
  USING (
       visibility = 'public'
    OR creator_id = auth.uid()
    OR EXISTS (           -- members may read
         SELECT 1
         FROM public.floq_participants fp
         WHERE fp.floq_id = floqs.id
           AND fp.profile_id = auth.uid()
       )
  );

/* Creator may update */
DROP POLICY IF EXISTS floqs_creator_update ON public.floqs;
CREATE POLICY floqs_creator_update
  ON public.floqs
  FOR UPDATE
  USING (creator_id = auth.uid());

/* Creator may delete */
DROP POLICY IF EXISTS floqs_creator_delete ON public.floqs;
CREATE POLICY floqs_creator_delete
  ON public.floqs
  FOR DELETE
  USING (creator_id = auth.uid());

/* Creator may insert via direct RPC (optional) */
DROP POLICY IF EXISTS floqs_creator_insert ON public.floqs;
CREATE POLICY floqs_creator_insert
  ON public.floqs
  FOR INSERT
  WITH CHECK (creator_id = auth.uid());

/* ────────────────────────────────────────────────────────────────
   2.  F L O Q _ P A R T I C I P A N T S  (read only for now)
──────────────────────────────────────────────────────────────── */

ALTER TABLE public.floq_participants ENABLE ROW LEVEL SECURITY;

/* Remove ALL old policies to avoid recursion */
DROP POLICY IF EXISTS floq_participants_unified_read  ON public.floq_participants;
DROP POLICY IF EXISTS floq_participants_read          ON public.floq_participants;
DROP POLICY IF EXISTS "Participating profile can read" ON public.floq_participants;
DROP POLICY IF EXISTS fp_public_floq_view ON public.floq_participants;
DROP POLICY IF EXISTS owner_select ON public.floq_participants;

/* Loop-free read: own rows OR rows of public floqs.
   **No** lookup back into floq_participants, so no cycle. */
CREATE POLICY floq_participants_read
  ON public.floq_participants
  FOR SELECT
  USING (
       profile_id = auth.uid()                               -- own row
    OR EXISTS (
         SELECT 1 FROM public.floqs f
         WHERE f.id = floq_participants.floq_id
           AND f.visibility = 'public'
       )
  );

COMMIT;