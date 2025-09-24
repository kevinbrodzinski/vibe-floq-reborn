BEGIN;

--──────────────────────────────
-- 1 ▸ Drop *all* existing policies on the two tables
--──────────────────────────────
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT 'public.' || tablename  AS tbl,
           policyname             AS pol
    FROM   pg_policies
    WHERE  schemaname = 'public'
      AND  tablename  IN ('friendships','friend_requests')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %s;', r.pol, r.tbl);
  END LOOP;
END $$;

--──────────────────────────────
-- 2 ▸ FRIENDSHIPS policies
--──────────────────────────────
CREATE POLICY friendships_participant_read
  ON public.friendships
  FOR SELECT
  USING (user_id = auth.uid() OR friend_id = auth.uid());

CREATE POLICY friendships_participant_update
  ON public.friendships
  FOR UPDATE
  USING (user_id = auth.uid() OR friend_id = auth.uid());

CREATE POLICY friendships_participant_delete
  ON public.friendships
  FOR DELETE
  USING (user_id = auth.uid() OR friend_id = auth.uid());

CREATE POLICY friendships_create_own
  ON public.friendships
  FOR INSERT
  WITH CHECK (user_id = auth.uid() OR friend_id = auth.uid());

--──────────────────────────────
-- 3 ▸ FRIEND_REQUESTS policies
--──────────────────────────────
CREATE POLICY friend_requests_participant_read
  ON public.friend_requests
  FOR SELECT
  USING (profile_id = auth.uid() OR friend_id = auth.uid());

CREATE POLICY friend_requests_send_own
  ON public.friend_requests
  FOR INSERT
  WITH CHECK (profile_id = auth.uid() AND friend_id <> auth.uid());

CREATE POLICY friend_requests_respond
  ON public.friend_requests
  FOR UPDATE
  USING (profile_id = auth.uid() OR friend_id = auth.uid())
  WITH CHECK (profile_id = auth.uid() OR friend_id = auth.uid());

--──────────────────────────────
-- 4 ▸ Verification
--──────────────────────────────
DO $$
DECLARE
  missing int;
BEGIN
  SELECT count(*) INTO missing
  FROM   (VALUES
          ('friendships','friendships_participant_read'),
          ('friendships','friendships_participant_update'),
          ('friendships','friendships_participant_delete'),
          ('friendships','friendships_create_own'),
          ('friend_requests','friend_requests_participant_read'),
          ('friend_requests','friend_requests_send_own'),
          ('friend_requests','friend_requests_respond')
         ) AS target(tbl, pol)
  WHERE  NOT EXISTS (
           SELECT 1 FROM pg_policies
           WHERE  schemaname = 'public'
             AND  tablename  = tbl
             AND  policyname = pol
         );

  IF missing > 0 THEN
    RAISE EXCEPTION '% policies missing after migration', missing;
  ELSE
    RAISE NOTICE 'Phase 1 complete – consolidated policies in place.';
  END IF;
END $$;

COMMIT;