-- 04_cron_idempotent.sql
-- Make pg-cron jobs idempotent
DELETE FROM cron.job WHERE jobname = 'match_gps_venues';
DELETE FROM cron.job WHERE jobname = 'build_afterglow_3am';

SELECT cron.schedule(
  'match_gps_venues',
  '*/5 * * * *',
  $$SELECT public.match_locations_batch(now() - INTERVAL '10 minutes');$$
);

SELECT cron.schedule(
  'build_afterglow_3am',
  '0 3 * * *',
  $$SELECT public.build_daily_afterglow((now() - INTERVAL '1 day')::DATE);$$
);