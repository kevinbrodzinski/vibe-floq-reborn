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
           polname                AS pol
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
--   a) participants may read / update / delete
CREATE POLICY friendships_participant_access
  ON public.friendships
  FOR SELECT, UPDATE, DELETE
  USING (user_id = auth.uid() OR friend_id = auth.uid());

--   b) either participant may create the row
CREATE POLICY friendships_create_own
  ON public.friendships
  FOR INSERT
  WITH CHECK (user_id = auth.uid() OR friend_id = auth.uid());

--──────────────────────────────
-- 3 ▸ FRIEND_REQUESTS policies
--──────────────────────────────
--   a) participants may read
CREATE POLICY friend_requests_participant_access
  ON public.friend_requests
  FOR SELECT
  USING (profile_id = auth.uid() OR friend_id = auth.uid());

--   b) sender may create
CREATE POLICY friend_requests_send_own
  ON public.friend_requests
  FOR INSERT
  WITH CHECK (profile_id = auth.uid() AND friend_id <> auth.uid());

--   c) receiver **or** sender may update status
CREATE POLICY friend_requests_respond
  ON public.friend_requests
  FOR UPDATE
  USING (
      profile_id = auth.uid()  -- sender can cancel
   OR friend_id = auth.uid()   -- receiver can accept/decline
  )
  WITH CHECK (
      profile_id = auth.uid()
   OR friend_id = auth.uid()
  );

--──────────────────────────────
-- 4 ▸ Verification
--──────────────────────────────
DO $$
DECLARE
  missing int;
BEGIN
  SELECT count(*) INTO missing
  FROM   (VALUES
          ('friendships','friendships_participant_access'),
          ('friendships','friendships_create_own'),
          ('friend_requests','friend_requests_participant_access'),
          ('friend_requests','friend_requests_send_own'),
          ('friend_requests','friend_requests_respond')
         ) AS target(tbl, pol)
  WHERE  NOT EXISTS (
           SELECT 1 FROM pg_policies
           WHERE  schemaname = 'public'
             AND  tablename  = tbl
             AND  polname    = pol
         );

  IF missing > 0 THEN
    RAISE EXCEPTION '% policies missing after migration', missing;
  ELSE
    RAISE NOTICE 'Phase 1 complete – consolidated policies in place.';
  END IF;
END $$;

COMMIT;