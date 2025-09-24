-- Skip backfill since data already exists, just set up the cron job
SELECT cron.schedule(
  'generate_daily_afterglow',
  '0 2 * * *', -- Run at 2 AM daily
  $$
  SELECT public.generate_daily_afterglow_sql(id, (current_date - interval '1 day')::date)
  FROM auth.users
  WHERE last_sign_in_at > now() - interval '30 days'; -- Only active users
  $$
);