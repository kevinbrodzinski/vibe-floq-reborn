/* ---------------------------------------------------------------------
   🔒  Phase 4 – Critical Security Hardening  (PG  ≥ 13 / < 15 edition)
   ------------------------------------------------------------------- */
BEGIN;


/* ------------------------------------------------------------------ */
/* 1.  Replace SECURITY DEFINER views                                 */
/* ------------------------------------------------------------------ */
-- Drop existing views first (cascades handled automatically)
DROP VIEW IF EXISTS public.latest_floq_counts      CASCADE;
DROP VIEW IF EXISTS public.user_activity_summary   CASCADE;
DROP VIEW IF EXISTS public.vibe_cluster_summary    CASCADE;
DROP VIEW IF EXISTS public.friend_presence_view    CASCADE;

-- Re-create views WITHOUT "SECURITY DEFINER"
-- and mark them as SECURITY_BARRIER so row-security is honoured first.
-- Finally, hand ownership to the low-privilege "authenticated" role.
CREATE OR REPLACE VIEW public.latest_floq_counts
  WITH (security_barrier = TRUE) AS
SELECT
  f.id,
  f.title,
  COUNT(fp.user_id) AS participant_count,
  f.created_at
FROM public.floqs f
LEFT JOIN public.floq_participants fp ON fp.floq_id = f.id
WHERE f.deleted_at IS NULL
GROUP BY f.id, f.title, f.created_at;

ALTER VIEW public.latest_floq_counts OWNER TO authenticated;

/* -- Repeat for the other three views ----------------------------- */
--  user_activity_summary
CREATE OR REPLACE VIEW public.user_activity_summary
  WITH (security_barrier = TRUE) AS
SELECT
  u.id,
  u.username,
  COUNT(a.id) AS actions_last_24h
FROM public.users u
LEFT JOIN public.user_actions a
       ON a.user_id = u.id
      AND a.created_at >= now() - INTERVAL '24 hours'
GROUP BY u.id, u.username;

ALTER VIEW public.user_activity_summary OWNER TO authenticated;

--  vibe_cluster_summary  (dummy definition – adjust to your schema)
CREATE OR REPLACE VIEW public.vibe_cluster_summary
  WITH (security_barrier = TRUE) AS
SELECT
  c.cluster_id,
  COUNT(*)                AS total_vibes,
  MAX(c.updated_at)       AS last_update
FROM public.vibe_clusters c
GROUP BY c.cluster_id;

ALTER VIEW public.vibe_cluster_summary OWNER TO authenticated;

--  friend_presence_view  (dummy definition – adjust to your schema)
CREATE OR REPLACE VIEW public.friend_presence_view
  WITH (security_barrier = TRUE) AS
SELECT
  p.user_id,
  p.lat,
  p.lng,
  p.updated_at
FROM public.presence p
JOIN public.friendships f ON f.friend_id = p.user_id
WHERE f.user_id = auth.uid();

ALTER VIEW public.friend_presence_view OWNER TO authenticated;


/* ------------------------------------------------------------------ */
/* 2.  Enable RLS on every table that still has it off                */
/* ------------------------------------------------------------------ */
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT format('%I.%I', n.nspname, c.relname) AS fqtn
    FROM pg_class  c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relrowsecurity IS FALSE
  LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', t.fqtn);
    RAISE NOTICE '✅  RLS enabled on %', t.fqtn;
  END LOOP;
END $$;


/* ------------------------------------------------------------------ */
/* 3.  Lock down SECURITY DEFINER functions (stable search_path)      */
/* ------------------------------------------------------------------ */
ALTER FUNCTION public.refresh_leaderboard_cache()  SET search_path = public, pg_catalog;
ALTER FUNCTION public.monitor_username_conflict()  SET search_path = public, pg_catalog;
ALTER FUNCTION public.touch_vibe_updated_at()      SET search_path = public, pg_catalog;
ALTER FUNCTION public.cleanup_old_vibes()          SET search_path = public, pg_catalog;
ALTER FUNCTION public.gen_plan_share_slug()        SET search_path = public, pg_catalog;

-- Catch any other SECURITY DEFINER functions dynamically
DO $$
DECLARE
  f record;
BEGIN
  FOR f IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND p.proname NOT LIKE 'st_%'        -- ignore PostGIS helpers
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %I.%I(%s) SET search_path = public, pg_catalog',
      f.nspname, f.proname, f.args
    );
  END LOOP;
END $$;


/* ------------------------------------------------------------------ */
/* 4.  Add baseline policies to any table still missing them          */
/* ------------------------------------------------------------------ */
DO $$
DECLARE
  t           text;
  has_uid     BOOLEAN;
  has_creator BOOLEAN;
BEGIN
  FOR t IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT IN (SELECT DISTINCT tablename FROM pg_policies WHERE schemaname = 'public')
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'user_id'
    ) INTO has_uid;

    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'creator_id'
    ) INTO has_creator;

    IF has_uid THEN
      EXECUTE format(
        $$CREATE POLICY "own_records_user_id" ON public.%I
          FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());$$,
        t);
    ELSIF has_creator THEN
      EXECUTE format(
        $$CREATE POLICY "own_records_creator_id" ON public.%I
          FOR ALL USING (creator_id = auth.uid()) WITH CHECK (creator_id = auth.uid());$$,
        t);
    ELSE
      EXECUTE format(
        $$CREATE POLICY "authenticated_readonly" ON public.%I
          FOR SELECT USING (auth.uid() IS NOT NULL);$$,
        t);
    END IF;
  END LOOP;
END $$;


/* ------------------------------------------------------------------ */
/* 5.  Storage bucket hardening                                       */
/* ------------------------------------------------------------------ */
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', TRUE),
       ('documents','documents',FALSE)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar"    ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar"    ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own documents"   ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own documents" ON storage.objects;

CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own avatar"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own documents"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can upload their own documents"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );


/* ------------------------------------------------------------------ */
/* 6.  Minimal audit-log placeholder                                  */
/* ------------------------------------------------------------------ */
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type  text NOT NULL,
  details     jsonb      DEFAULT '{}'::jsonb,
  created_at  timestamptz DEFAULT now(),
  applied_by  uuid        NULL    -- auth.uid() if available
);

ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_log_no_access" ON public.security_audit_log
  FOR SELECT USING (false);

INSERT INTO public.security_audit_log (event_type, details, applied_by)
VALUES ('critical_security_fixes_applied_pg14', json_build_object('ts', now()), auth.uid());


COMMIT;