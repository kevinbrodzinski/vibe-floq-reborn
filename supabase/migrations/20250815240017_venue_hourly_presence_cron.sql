-- 17: run 5-min refresh
SELECT cron.schedule('venue-hourly-presence', '*/5 * * * *',
$$SELECT public.refresh_venue_hourly_presence();$$)
ON CONFLICT DO NOTHING;