/*───────────────────────────────────────────────────────────────
  0.  PRE-REQ  – keep extension objects out of `public`
────────────────────────────────────────────────────────────────*/
CREATE SCHEMA IF NOT EXISTS extensions;

/*───────────────────────────────────────────────────────────────
  1.  COLUMN  – add `expires_at` for stale-row cleanup
────────────────────────────────────────────────────────────────*/
ALTER TABLE public.vibes_now
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

/*───────────────────────────────────────────────────────────────
  2.  INDEX   – speed up look-ups by user_id
     (plain CREATE INDEX is fine inside a txn)
────────────────────────────────────────────────────────────────*/
CREATE INDEX IF NOT EXISTS idx_vibes_now_user_id
  ON public.vibes_now (user_id);

/*───────────────────────────────────────────────────────────────
  3.  FUNCTION – delete >24 h-old rows, max 1000 / call
────────────────────────────────────────────────────────────────*/
CREATE OR REPLACE FUNCTION public.cleanup_old_vibes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  DELETE FROM public.vibes_now
  WHERE ctid IN (
    SELECT ctid FROM public.vibes_now
    WHERE expires_at < (now() - INTERVAL '24 hours')
    LIMIT 1000
  );
END;
$$;

/*───────────────────────────────────────────────────────────────
  4.  CRON JOB – run once per hour *only* if pg_cron exists
────────────────────────────────────────────────────────────────*/
DO $$
BEGIN
  -- pg_cron adds schema `cron` and table `cron.job`
  IF EXISTS (
       SELECT 1
       FROM   information_schema.tables
       WHERE  table_schema = 'cron'
       AND    table_name   = 'job'
     )
  THEN
    IF NOT EXISTS (
         SELECT 1
         FROM   cron.job
         WHERE  jobname = 'vibes-now-cleanup'
       )
    THEN
      PERFORM cron.schedule(
        'vibes-now-cleanup',
        '0 * * * *',
        $cron$SELECT public.cleanup_old_vibes();$cron$
      );
    END IF;
  END IF;
END;
$$;