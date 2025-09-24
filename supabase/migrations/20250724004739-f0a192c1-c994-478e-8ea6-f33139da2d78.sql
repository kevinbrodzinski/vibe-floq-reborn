/* ---------------------------------------------------------------------
   🔒  Phase 4 – Critical Security Hardening  (PG ≥13, no owner changes)
   ------------------------------------------------------------------- */
BEGIN;

/* ------------------------------------------------------------------ */
/* 1. Enable RLS on every table that still has it off                 */
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
      AND c.relkind  = 'r'
      AND c.relrowsecurity = FALSE
  LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', t.fqtn);
    RAISE NOTICE '✅  RLS enabled on %', t.fqtn;
  END LOOP;
END $$;

/* ------------------------------------------------------------------ */
/* 2. Pin search_path on SECURITY DEFINER functions                   */
/* ------------------------------------------------------------------ */
ALTER FUNCTION IF EXISTS public.refresh_leaderboard_cache()  SET search_path = public, pg_catalog;
ALTER FUNCTION IF EXISTS public.monitor_username_conflict()  SET search_path = public, pg_catalog;
ALTER FUNCTION IF EXISTS public.touch_vibe_updated_at()      SET search_path = public, pg_catalog;
ALTER FUNCTION IF EXISTS public.cleanup_old_vibes()          SET search_path = public, pg_catalog;
ALTER FUNCTION IF EXISTS public.gen_plan_share_slug()        SET search_path = public, pg_catalog;

/* ------------------------------------------------------------------ */
/* 3. Storage-bucket hardening                                        */
/* ------------------------------------------------------------------ */
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars','avatars',TRUE),
       ('documents','documents',FALSE)
ON CONFLICT (id) DO NOTHING;

-- make sure RLS is on
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

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
/* 4. Minimal audit-log scaffold                                      */
/* ------------------------------------------------------------------ */
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type  text     NOT NULL,
  details     jsonb    DEFAULT '{}'::jsonb,
  created_at  timestamptz DEFAULT now(),
  applied_by  uuid     NULL
);

ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_log_no_access
  ON public.security_audit_log
  FOR SELECT USING (false);

-- allow everyone to write their own audit rows (tighten later if you add roles)
CREATE POLICY audit_log_write_any
  ON public.security_audit_log
  FOR INSERT WITH CHECK (true);

INSERT INTO public.security_audit_log (event_type, details, applied_by)
VALUES ('critical_security_fixes_applied_pg14', json_build_object('ts', now()), auth.uid());

COMMIT;