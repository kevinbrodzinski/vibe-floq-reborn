/* ---------------------------------------------------------------------
   🔒  Security Hardening – application tables only  (PG ≥13)
   ------------------------------------------------------------------- */
BEGIN;

/* ------------------------------------------------------------------ */
/* 1. Enable RLS on every *application* table still off               */
/* ------------------------------------------------------------------ */
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT format('%I.%I', n.nspname, c.relname)
    FROM   pg_class  c
    JOIN   pg_namespace n ON n.oid = c.relnamespace
    WHERE  n.nspname = 'public'
      AND  c.relkind  = 'r'
      AND  c.relrowsecurity = FALSE
      AND  c.relname NOT IN ('spatial_ref_sys', 'geometry_columns', 'geography_columns')
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', t);
      RAISE NOTICE '✅  RLS enabled on %', t;
    EXCEPTION
      WHEN insufficient_privilege THEN
        RAISE NOTICE '⚠️  skipped % (not owner)', t;
    END;
  END LOOP;
END $$;

/* ------------------------------------------------------------------ */
/* 2. Pin search_path on SECURITY DEFINER functions                   */
/* ------------------------------------------------------------------ */
DO $$
DECLARE
  f TEXT;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.refresh_leaderboard_cache()',
    'public.monitor_username_conflict()',
    'public.touch_vibe_updated_at()',
    'public.cleanup_old_vibes()',
    'public.gen_plan_share_slug()'
  ]
  LOOP
    BEGIN
      EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_catalog', f);
      RAISE NOTICE '✅  search_path fixed for %', f;
    EXCEPTION
      WHEN undefined_function THEN
        RAISE NOTICE '⚠️  % not found, skipping', f;
    END;
  END LOOP;
END $$;

/* ------------------------------------------------------------------ */
/* 3. Storage-bucket hardening                                        */
/* ------------------------------------------------------------------ */
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars','avatars',TRUE),
       ('documents','documents',FALSE)
ON CONFLICT (id) DO NOTHING;

/* ensure RLS is on (ignore if we aren't owner) */
DO $$
BEGIN
  BEGIN
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE '⚠️  could not ALTER storage.objects (not owner) – assume RLS already on';
  END;
END $$;

/* Replace policies */
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar"    ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar"    ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own documents"   ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own documents" ON storage.objects;

CREATE POLICY "Avatar images public read"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Avatar upload"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Avatar update"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Docs view own"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Docs upload own"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

/* ------------------------------------------------------------------ */
/* 4. Minimal audit-log scaffold                                      */
/* ------------------------------------------------------------------ */
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type  text        NOT NULL,
  details     jsonb       DEFAULT '{}'::jsonb,
  created_at  timestamptz DEFAULT now(),
  applied_by  uuid
);

ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_log_no_access  ON public.security_audit_log;
DROP POLICY IF EXISTS audit_log_write_any  ON public.security_audit_log;

CREATE POLICY audit_log_no_access
  ON public.security_audit_log
  FOR SELECT USING (false);

CREATE POLICY audit_log_write_any          -- loosen later if you create roles
  ON public.security_audit_log
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

INSERT INTO public.security_audit_log (event_type, details, applied_by)
VALUES ('critical_security_hardening_pg14',
        json_build_object('ts', now()),
        auth.uid());

COMMIT;