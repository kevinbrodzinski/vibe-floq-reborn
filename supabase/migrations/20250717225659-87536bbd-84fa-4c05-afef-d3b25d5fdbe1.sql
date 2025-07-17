/* ──────────────────────────────────────────────────────────────
  0.  Ensure the optional extension schema is present
──────────────────────────────────────────────────────────────── */
CREATE SCHEMA IF NOT EXISTS extensions;

/* ──────────────────────────────────────────────────────────────
  1.  Add expires_at column (safe / idempotent)
──────────────────────────────────────────────────────────────── */
ALTER TABLE public.vibes_now
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

/* ──────────────────────────────────────────────────────────────
  2.  Performance index on user_id
      – Use CONCURRENTLY only when we're *not* inside a transaction
──────────────────────────────────────────────────────────────── */
DO $$
BEGIN
  IF current_setting('in_transaction') = 'on' THEN
    -- Most migration wrappers open a transaction around the whole file
    -- so we create a plain index (still idempotent).
    EXECUTE '
      CREATE INDEX IF NOT EXISTS idx_vibes_now_user_id
      ON public.vibes_now (user_id)';
  ELSE
    EXECUTE '
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vibes_now_user_id
      ON public.vibes_now (user_id)';
  END IF;
END$$;

/* ──────────────────────────────────────────────────────────────
  3.  House-keeping function
──────────────────────────────────────────────────────────────── */
CREATE OR REPLACE FUNCTION public.cleanup_old_vibes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  -- delete at most 1 000 stale rows per call
  DELETE FROM public.vibes_now
  WHERE expires_at < (now() - interval '24 hours')
  LIMIT 1000;
END;
$$;

/* ──────────────────────────────────────────────────────────────
  4.  Schedule the job (only if pg_cron is installed)
──────────────────────────────────────────────────────────────── */
DO $$
BEGIN
  -- pg_cron creates schema "cron" and table cron.job
  IF EXISTS (
        SELECT 1
        FROM   information_schema.tables
        WHERE  table_schema = 'cron'
        AND    table_name   = 'job'
     ) THEN
    -- create the job once (idempotent)
    IF NOT EXISTS (
          SELECT 1
          FROM   cron.job
          WHERE  jobname = 'vibes-now-cleanup'
       ) THEN
      PERFORM cron.schedule(
        'vibes-now-cleanup',
        '0 * * * *',                       -- every hour
        $$SELECT public.cleanup_old_vibes();$$
      );
    END IF;
  END IF;
END$$;