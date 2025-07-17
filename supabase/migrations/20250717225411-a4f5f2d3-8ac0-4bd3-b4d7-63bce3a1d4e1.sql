/* ──────────────────────────────────────────────────────────────
  1.  Safety-first: make sure the required column exists
      (older databases may not have expires_at yet)
──────────────────────────────────────────────────────────────── */
ALTER TABLE public.vibes_now
    ADD COLUMN IF NOT EXISTS expires_at timestamptz;

/* ──────────────────────────────────────────────────────────────
  2.  Performance: covering index for single-row look-ups
──────────────────────────────────────────────────────────────── */
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vibes_now_user_id
    ON public.vibes_now (user_id);

/* ──────────────────────────────────────────────────────────────
  3.  House-keeping function
      – removes rows whose expires_at is > 24 h old
──────────────────────────────────────────────────────────────── */
CREATE OR REPLACE FUNCTION public.cleanup_old_vibes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER                          -- runs with object owner rights
SET search_path = public, extensions      -- deterministic search_path
AS $$
BEGIN
  -- "leaky-bucket" delete: cap at 1 000 rows / call
  DELETE FROM public.vibes_now
  WHERE expires_at < (now() - interval '24 hours')
  LIMIT 1000;
END;
$$;

/* ──────────────────────────────────────────────────────────────
  4.  Invoke the cleanup once per hour via pg_cron
      (skip if pg_cron extension isn't installed)
──────────────────────────────────────────────────────────────── */
-- create extension if not exists pg_cron with schema extensions;

SELECT
  cron.schedule(
    'vibes-now-cleanup',
    '0 * * * *',          -- every hour, at minute 0
    $$CALL public.cleanup_old_vibes();$$
  )
ON CONFLICT (jobname) DO NOTHING;