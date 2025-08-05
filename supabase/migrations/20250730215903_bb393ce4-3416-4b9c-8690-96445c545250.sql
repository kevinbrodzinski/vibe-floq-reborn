/* ════════════════════════════════════════════════════════════════════════
   Phase-2  Security Hardening  ―  Idempotent Migration
   (PG14-safe: no CREATE POLICY IF NOT EXISTS)
   ═════════════════════════════════════════════════════════════════════ */

BEGIN;

/*─────────────────────────────────────────────────────────────────────────
  0. Create helper role `authenticated` if the project does not yet have it
  ─────────────────────────────────────────────────────────────────────────*/
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname = 'authenticated'
  ) THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
END$$;

/*─────────────────────────────────────────────────────────────────────────
  1. ENABLE  +  FORCE  RLS  on target tables  (works whatever the state)
  ─────────────────────────────────────────────────────────────────────────*/
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'friend_last_points',
    'function_replacements',
    'presence'
  ]
  LOOP
    /* enable if RLS absent */
    PERFORM 1
    FROM   pg_class  c
    JOIN   pg_namespace n ON n.oid = c.relnamespace
    WHERE  n.nspname='public' AND c.relname=t AND NOT c.relrowsecurity;

    IF FOUND THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    END IF;

    /* force if not yet forced */
    PERFORM 1
    FROM   pg_class  c
    JOIN   pg_namespace n ON n.oid = c.relnamespace
    WHERE  n.nspname='public' AND c.relname=t AND NOT c.relforcerowsecurity;

    IF FOUND THEN
      EXECUTE format('ALTER TABLE public.%I FORCE  ROW LEVEL SECURITY', t);
    END IF;
  END LOOP;
END$$;

/*─────────────────────────────────────────────────────────────────────────
  2.  POLICIES  ─── drop duplicates then (re-)create wanted ones
  ─────────────────────────────────────────────────────────────────────────*/

------------------------------------------------------------------------
-- 2a  friend_last_points  (owner-only ALL policy)
------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public'
        AND tablename ='friend_last_points'
        AND policyname='friend_last_points_owner_access'
  ) THEN
    CREATE POLICY friend_last_points_owner_access
      ON public.friend_last_points
      FOR ALL
      USING  (profile_id = auth.uid())
      WITH CHECK (profile_id = auth.uid());
  END IF;
END$$;

------------------------------------------------------------------------
-- 2b  function_replacements
------------------------------------------------------------------------
DO $$
BEGIN
  /* drop stale policies if names clash */
  IF EXISTS (SELECT 1 FROM pg_policies
             WHERE schemaname='public'
               AND tablename ='function_replacements'
               AND policyname = 'function_replacements_read')
  THEN
    EXECUTE 'DROP POLICY function_replacements_read ON public.function_replacements';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies
             WHERE schemaname='public'
               AND tablename ='function_replacements'
               AND policyname = 'function_replacements_admin_write')
  THEN
    EXECUTE 'DROP POLICY function_replacements_admin_write ON public.function_replacements';
  END IF;

  /* read for any logged-in user, write only for service role */
  CREATE POLICY function_replacements_read
    ON public.function_replacements
    FOR SELECT
    USING (auth.uid() IS NOT NULL OR auth.role() = 'service_role');

  CREATE POLICY function_replacements_admin_write
    ON public.function_replacements
    FOR ALL
    USING      (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
END$$;

------------------------------------------------------------------------
-- 2c  presence   (public / owner / friends)
------------------------------------------------------------------------
DO $$
DECLARE
  pol TEXT;
BEGIN
  /* remove older overlapping owner / read policies */
  FOREACH pol IN ARRAY ARRAY[
    'presence_public_read',
    'presence_owner_write',
    'presence_owner_update',
    'presence_owner_manage'
  ]
  LOOP
    IF EXISTS (SELECT 1 FROM pg_policies
               WHERE schemaname='public' AND tablename='presence'
               AND policyname = pol)
    THEN
      EXECUTE format('DROP POLICY %I ON public.presence', pol);
    END IF;
  END LOOP;

  /* read rules */
  CREATE POLICY presence_public_read
    ON public.presence
    FOR SELECT
    USING (
           visibility = 'public'
        OR profile_id = auth.uid()
        OR (visibility = 'friends' AND EXISTS (
              SELECT 1 FROM public.friendships f
              WHERE (f.user_low  = auth.uid() AND f.user_high = profile_id)
                 OR (f.user_high = auth.uid() AND f.user_low  = profile_id)
            ))
    );

  /* owner full control */
  CREATE POLICY presence_owner_manage
    ON public.presence
    FOR ALL
    USING      (profile_id = auth.uid())
    WITH CHECK (profile_id = auth.uid());
END$$;

/*─────────────────────────────────────────────────────────────────────────
  3.  Default SELECT policy on *any* RLS table still missing policies
  ─────────────────────────────────────────────────────────────────────────*/
DO $$
DECLARE
  rec RECORD;
  _pname TEXT;
BEGIN
  FOR rec IN
      SELECT c.relname AS table_name
      FROM   pg_class  c
      JOIN   pg_namespace n ON n.oid = c.relnamespace
      WHERE  n.nspname = 'public'
        AND  c.relkind = 'r'
        AND  c.relrowsecurity
        AND NOT EXISTS (
              SELECT 1 FROM pg_policies p
              WHERE p.schemaname='public'
                AND p.tablename = c.relname)
  LOOP
    _pname := rec.table_name || '_default_select';
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT USING (auth.uid() IS NOT NULL)',
      _pname, rec.table_name
    );
  END LOOP;
END$$;

/*─────────────────────────────────────────────────────────────────────────
  4.  SECURITY-DEFINER functions (search_path fixed)
  ─────────────────────────────────────────────────────────────────────────*/

-- 4a get_vibe_clusters  (unchanged, but included for completeness)
--    … already in your script …

-- 4b upsert_presence
CREATE OR REPLACE FUNCTION public.upsert_presence(
  p_venue_id   uuid,
  p_lat        double precision,
  p_lng        double precision,
  p_vibe       vibe_enum,
  p_visibility text DEFAULT 'public',
  p_profile_id uuid DEFAULT auth.uid()
)
RETURNS public.vibes_now
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_row public.vibes_now%rowtype;
BEGIN
  IF p_lat IS NULL OR p_lng IS NULL THEN
     RAISE EXCEPTION 'Latitude and longitude required';
  END IF;

  INSERT INTO public.vibes_now AS v
      (profile_id, venue_id, vibe, visibility,
       location, updated_at, expires_at)
  VALUES (p_profile_id,
          p_venue_id,
          p_vibe,
          p_visibility,
          ST_SetSRID(ST_MakePoint(p_lng, p_lat),4326),
          NOW(),
          NOW() + INTERVAL '30 minutes')
  ON CONFLICT (profile_id)
  DO UPDATE
     SET venue_id   = EXCLUDED.venue_id,
         vibe       = EXCLUDED.vibe,
         visibility = EXCLUDED.visibility,
         location   = EXCLUDED.location,
         updated_at = NOW(),
         expires_at = NOW() + INTERVAL '30 minutes'
  RETURNING * INTO v_row;

  RETURN v_row;
END$$;

-- 4c award_achievement_optimized  (full finished body)
CREATE OR REPLACE FUNCTION public.award_achievement_optimized(
  _user uuid,
  _code text,
  _increment integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  achievement_goal integer;
  was_just_earned  boolean := false;
  final_progress   integer;
  achievement_rec  record;
BEGIN
  IF _increment <= 0 THEN
    RAISE EXCEPTION 'Increment must be positive';
  END IF;

  SELECT goal, name, icon, metadata
  INTO   achievement_rec
  FROM   public.achievement_catalogue
  WHERE  code = _code;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown achievement code: %', _code;
  END IF;

  INSERT INTO public.user_achievements (profile_id, code, progress)
  VALUES (_user, _code, _increment)
  ON CONFLICT (profile_id, code) DO UPDATE
  SET progress = LEAST(
                  user_achievements.progress + EXCLUDED.progress,
                  achievement_rec.goal),
      earned_at = COALESCE(
        user_achievements.earned_at,
        CASE
          WHEN user_achievements.progress + EXCLUDED.progress
               >= achievement_rec.goal
          THEN NOW()
        END)
  RETURNING
    progress,
    (earned_at IS NOT NULL
     AND earned_at > NOW() - INTERVAL '2 seconds') AS just_earned
  INTO final_progress, was_just_earned;

  RETURN jsonb_build_object(
    'code',    _code,
    'progress',final_progress,
    'goal',    achievement_rec.goal,
    'was_earned', was_just_earned,
    'progress_pct',
       ROUND(final_progress::numeric
             / GREATEST(achievement_rec.goal,1) * 100, 1),
    'details', jsonb_build_object(
                  'name', achievement_rec.name,
                  'icon', achievement_rec.icon,
                  'meta', achievement_rec.metadata)
  );
END$$;

/*─────────────────────────────────────────────────────────────────────────
  5.  (Optional)   grant read on mat-views only to authenticated role
  ─────────────────────────────────────────────────────────────────────────*/
DO $$
DECLARE
  mv RECORD;
BEGIN
  FOR mv IN
    SELECT schemaname, matviewname
    FROM   pg_matviews
    WHERE  schemaname = 'public'
  LOOP
    EXECUTE format('REVOKE ALL ON %I.%I FROM PUBLIC',
                   mv.schemaname, mv.matviewname);
    EXECUTE format('GRANT SELECT ON %I.%I TO authenticated',
                   mv.schemaname, mv.matviewname);
  END LOOP;
END$$;

/*─────────────────────────────────────────────────────────────────────────*/
COMMIT;