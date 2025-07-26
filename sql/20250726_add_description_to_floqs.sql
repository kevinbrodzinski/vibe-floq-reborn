-- Adds rich-text description to every Floq
ALTER TABLE public.floqs
  ADD COLUMN IF NOT EXISTS description text;

-- Minimal RLS: read for anyone in the Floq, write for creator
DROP POLICY IF EXISTS floqs_select ON public.floqs;
CREATE POLICY floqs_select
  ON public.floqs FOR SELECT
  USING ( auth.uid() = creator_id
       OR auth.uid() IN (SELECT user_id FROM floq_participants WHERE floq_id = id) );

DROP POLICY IF EXISTS floqs_insert_creator ON public.floqs;
CREATE POLICY floqs_insert_creator
  ON public.floqs FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS floqs_update_creator ON public.floqs;
CREATE POLICY floqs_update_creator
  ON public.floqs FOR UPDATE
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);