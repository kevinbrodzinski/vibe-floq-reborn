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
DO $main$
BEGIN
  IF NOT EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'match_gps_venues'
  ) THEN
    PERFORM cron.schedule(
      'match_gps_venues',
      '*/5 * * * *',
      $job$SELECT public.match_locations_batch(now() - INTERVAL '10 minutes');$job$
    );
  END IF;
END $main$;

/* ──────────────────────────────────────────────────────────────
   03.  Daily afterglow build 03:00 UTC
   ──────────────────────────────────────────────────────────── */
DO $main2$
BEGIN
  IF NOT EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'build_afterglow_3am'
  ) THEN
    PERFORM cron.schedule(
      'build_afterglow_3am',
      '0 3 * * *',
      $job$SELECT public.build_daily_afterglow((now() - INTERVAL '1 day')::DATE);$job$
    );
  END IF;
END $main2$;

/* ──────────────────────────────────────────────────────────────
   04.  Tighten privileges on the two cron jobs
   ──────────────────────────────────────────────────────────── */
UPDATE cron.job
   SET nodename = 'localhost'
 WHERE jobname IN ('match_gps_venues', 'build_afterglow_3am');