-- ⚠️ MANUAL EXECUTION ONLY ⚠️
-- Run this manually in Supabase SQL Editor with supabase_admin role
-- Automated migrations can't modify cron.job due to permission restrictions

/* clean-slate */
DELETE FROM cron.job WHERE jobname IN (
  'nightly_stage_to_main',
  'match_gps_venues',
  'build_afterglow_3am',
  'purge_old_raw_locations',
  'vacuum_location_tables'
);

/* GPS venue matching every 5 minutes */
SELECT cron.schedule(
  'match_gps_venues',
  '*/5 * * * *',
  $$SELECT public.match_unmatched_pings();$$);

/* Build afterglow at 3 AM UTC for previous day */
SELECT cron.schedule(
  'build_afterglow_3am',
  '0 3 * * *',
  $$SELECT public.build_daily_afterglow((now()-interval '1 day')::date);$$);

/* Stage to main transfer at 2:55 AM UTC */
SELECT cron.schedule(
  'nightly_stage_to_main',
  '55 2 * * *',
  $$
  INSERT INTO public.raw_locations (user_id, captured_at, geom, acc, p_month)
  SELECT user_id, captured_at, 
         ST_Point(lng, lat)::geography, 
         acc,
         to_char(captured_at, 'YYYYMM')
  FROM public.raw_locations_staging
  ON CONFLICT DO NOTHING;
  
  TRUNCATE public.raw_locations_staging;
  $$);

/* Purge old raw locations at 2:30 AM UTC */
SELECT cron.schedule(
  'purge_old_raw_locations',
  '30 2 * * *',
  $$DELETE FROM public.raw_locations WHERE captured_at < now() - interval '30 days';$$);

/* Vacuum location tables weekly on Sunday at 1 AM UTC */
SELECT cron.schedule(
  'vacuum_location_tables',
  '0 1 * * 0',
  $$
  VACUUM ANALYZE public.raw_locations;
  VACUUM ANALYZE public.venue_visits;
  $$);