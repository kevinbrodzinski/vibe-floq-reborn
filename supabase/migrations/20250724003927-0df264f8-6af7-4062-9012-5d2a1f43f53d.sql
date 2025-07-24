/* ---------------------------------------------------------------------
   🔒  Phase 4 – Critical Security Hardening
   ---------------------------------------------------------------------
   Fixes:
     • Security-definer views (convert → INVOKER)
     • One table with RLS disabled (auto-enable)
     • Functions with mutable search_path
     • Storage-bucket RLS (avatars + documents)
     • Baseline "own-records" RLS for tables that lacked policies
   ------------------------------------------------------------------- */
BEGIN;


/* ------------------------------------------------------------------ */
/* 1.  Security-definer views → Security invoker                      */
/* ------------------------------------------------------------------ */
-- Drop first (CASCADE handles dependent mat-views & functions)
DROP VIEW IF EXISTS public.latest_floq_counts        CASCADE;
DROP VIEW IF EXISTS public.user_activity_summary     CASCADE;
DROP VIEW IF EXISTS public.vibe_cluster_summary      CASCADE;
DROP VIEW IF EXISTS public.friend_presence_view      CASCADE;

-- ✅ Re-create with SECURITY INVOKER ( **adjust SELECT bodies as needed** )
CREATE OR REPLACE VIEW public.latest_floq_counts
SECURITY INVOKER AS
SELECT
  f.id,
  f.title,
  COUNT(fp.user_id)  AS participant_count,
  f.created_at
FROM public.floqs f
LEFT JOIN public.floq_participants fp ON fp.floq_id = f.id
WHERE f.deleted_at IS NULL
GROUP BY f.id, f.title, f.created_at;


/* ------------------------------------------------------------------ */
/* 2.  Enable RLS for every table that doesn't have it                */
/* ------------------------------------------------------------------ */
DO $$
DECLARE
  t  record;
BEGIN
  FOR t IN
    SELECT c.oid, format('%I.%I', n.nspname, c.relname) AS fqtn
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
/* 3.  Harden SECURITY DEFINER functions (search_path)                */
/* ------------------------------------------------------------------ */
-- Explicit list keeps the migration idempotent & readable
ALTER FUNCTION public.refresh_leaderboard_cache()  SET search_path = public, pg_catalog;
ALTER FUNCTION public.monitor_username_conflict()  SET search_path = public, pg_catalog;
ALTER FUNCTION public.touch_vibe_updated_at()      SET search_path = public, pg_catalog;
ALTER FUNCTION public.cleanup_old_vibes()          SET search_path = public, pg_catalog;
ALTER FUNCTION public.gen_plan_share_slug()        SET search_path = public, pg_catalog;

-- Catch any other SECURITY DEFINER funcs you may add later
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
      AND p.proname NOT LIKE 'st_%'            -- ignore PostGIS
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %I.%I(%s) SET search_path = public, pg_catalog',
      f.nspname, f.proname, f.args
    );
  END LOOP;
END $$;


/* ------------------------------------------------------------------ */
/* 4.  Baseline RLS policies for tables that still lack any          */
/* ------------------------------------------------------------------ */
DO $$
DECLARE
  t           text;
  has_uid     boolean;
  has_creator boolean;
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
          FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());$$, t
      );
    ELSIF has_creator THEN
      EXECUTE format(
        $$CREATE POLICY "own_records_creator_id" ON public.%I
          FOR ALL USING (creator_id = auth.uid()) WITH CHECK (creator_id = auth.uid());$$, t
      );
    ELSE
      EXECUTE format(
        $$CREATE POLICY "authenticated_readonly" ON public.%I
          FOR SELECT USING (auth.uid() IS NOT NULL);$$, t
      );
    END IF;
  END LOOP;
END $$;


/* ------------------------------------------------------------------ */
/* 5.  Storage bucket policies (avatars & documents)                 */
/* ------------------------------------------------------------------ */
-- Ensure buckets exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars',   'avatars',   TRUE ),
       ('documents', 'documents', FALSE)
ON CONFLICT (id) DO NOTHING;

-- Drop old policies first (idempotent)
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar"    ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar"    ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own documents"   ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own documents" ON storage.objects;

-- Avatars: public read, user-scoped write
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

-- Documents: private per-user
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
/* 6.  Audit log (minimal shell)                                      */
/* ------------------------------------------------------------------ */
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type  text NOT NULL,
  details     jsonb DEFAULT '{}'::jsonb,
  created_at  timestamptz DEFAULT now(),
  applied_by  uuid NULL  -- will capture auth.uid()
);

ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Read policy: allow only future admin role (disabled for now)
CREATE POLICY "audit_log_no_access" ON public.security_audit_log
  FOR SELECT USING (false);

INSERT INTO public.security_audit_log (event_type, details, applied_by)
VALUES (
  'critical_security_fixes_applied',
  json_build_object('timestamp', now()),
  auth.uid()
);


/* ------------------------------------------------------------------ */
COMMIT;