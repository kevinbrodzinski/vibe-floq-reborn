/*───────────────────────────────────────────────────────────────
  0.  EXTENSIONS / helper schema (harmless if pre-existing)
───────────────────────────────────────────────────────────────*/
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto  WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS citext    WITH SCHEMA extensions;

/*───────────────────────────────────────────────────────────────
  1.  PROFILES ► conflict-monitor trigger  (re-instated)
───────────────────────────────────────────────────────────────*/
CREATE OR REPLACE FUNCTION public.monitor_username_conflict()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NEW.username IS DISTINCT FROM OLD.username
     AND EXISTS (
       SELECT 1
       FROM   public.profiles p
       WHERE  p.username = NEW.username
         AND  p.id      <> NEW.id
     )
  THEN
    RAISE EXCEPTION 'Username "%" is already taken', NEW.username;
  END IF;
  RETURN NEW;
END;
$$;

-- drop first so the CREATE TRIGGER below is idempotent
DROP TRIGGER IF EXISTS profiles_username_conflict_monitor
  ON public.profiles;

CREATE TRIGGER profiles_username_conflict_monitor
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.monitor_username_conflict();

/*───────────────────────────────────────────────────────────────
  2.  reserved_usernames ► RLS (read-only lookup list)
───────────────────────────────────────────────────────────────*/
ALTER TABLE public.reserved_usernames ENABLE ROW LEVEL SECURITY;

-- make sure we don't duplicate names
DROP POLICY IF EXISTS reserved_read ON public.reserved_usernames;

CREATE POLICY reserved_read
  ON public.reserved_usernames
  FOR SELECT
  USING (true);     -- anyone may read, nobody may write

/*───────────────────────────────────────────────────────────────
  3.  vibes_now ► keep updated_at fresh on every UPDATE
───────────────────────────────────────────────────────────────*/
-- ensure column exists
ALTER TABLE public.vibes_now
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE OR REPLACE FUNCTION public.touch_vibe_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS vibes_now_touch_updated_at
  ON public.vibes_now;

CREATE TRIGGER vibes_now_touch_updated_at
BEFORE UPDATE ON public.vibes_now
FOR EACH ROW EXECUTE FUNCTION public.touch_vibe_updated_at();

/*───────────────────────────────────────────────────────────────
  4.  OPTIONAL: covering index for look-ups by user_id
───────────────────────────────────────────────────────────────*/
CREATE INDEX IF NOT EXISTS idx_vibes_now_user_id
  ON public.vibes_now (user_id);

/*───────────────────────────────────────────────────────────────
  5.  House-keeping job (already present – create if missing)
───────────────────────────────────────────────────────────────*/
DO $$
BEGIN
  IF EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE  table_schema = 'cron' AND table_name = 'job'
     )
  THEN
    IF NOT EXISTS (
         SELECT 1 FROM cron.job
         WHERE  jobname = 'vibes-now-cleanup'
       )
    THEN
      PERFORM cron.schedule(
        'vibes-now-cleanup',
        '0 * * * *',                   -- every hour
        $$SELECT public.cleanup_old_vibes();$$
      );
    END IF;
  END IF;
END;
$$;