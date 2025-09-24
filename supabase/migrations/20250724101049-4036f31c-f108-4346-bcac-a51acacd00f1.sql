/* ──────────────────────────────────────────────────────────────
   01.  Ensure pg_cron is installed (Schema = cron)
   ──────────────────────────────────────────────────────────── */
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA cron;

/* Optional – let read-only roles see job run history */
GRANT USAGE   ON SCHEMA cron TO authenticated, service_role;
GRANT SELECT  ON ALL TABLES IN SCHEMA cron TO authenticated, service_role;

/* ──────────────────────────────────────────────────────────────
   02.  5-minute venue-matching job
   ──────────────────────────────────────────────────────────── */
DO $$
BEGIN
  IF NOT EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'match_gps_venues'
  ) THEN
    PERFORM cron.schedule(
      'match_gps_venues',                       -- jobname
      '*/5 * * * *',                            -- every 5 min
      $$                                        -- ★ SQL must be in $$ … $$
        SELECT public.match_locations_batch(
          now() - INTERVAL '10 minutes'
        );
      $$
    );
  END IF;
END $$;

/* ──────────────────────────────────────────────────────────────
   03.  Daily afterglow build 03:00 UTC
   ──────────────────────────────────────────────────────────── */
DO $$
BEGIN
  IF NOT EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'build_afterglow_3am'
  ) THEN
    PERFORM cron.schedule(
      'build_afterglow_3am',
      '0 3 * * *',
      $$
        SELECT public.build_daily_afterglow(
          (now() - INTERVAL '1 day')::DATE
        );
      $$
    );
  END IF;
END $$;

/* ──────────────────────────────────────────────────────────────
   04.  Tighten privileges on the two cron jobs
   ──────────────────────────────────────────────────────────── */
-- Only supabase_admin / service_role may ALTER or RUN them manually
UPDATE cron.job
   SET nodename = 'localhost'          -- leave scheduling node default
 WHERE jobname IN ('match_gps_venues', 'build_afterglow_3am');