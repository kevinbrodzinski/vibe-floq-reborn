-- 11a: (re)create cron jobs
SELECT cron.schedule('merge_visits_into_stays_every_2m', '*/2 * * * *',
$$SELECT public.merge_visits_into_stays();$$)
ON CONFLICT DO NOTHING;

SELECT cron.schedule('refresh_mv_trending_venues_5m', '*/5 * * * *',
$$SELECT public.refresh_mv_trending_venues();$$)
ON CONFLICT DO NOTHING;

SELECT cron.schedule('publish_hotspots_10m', '*/10 * * * *',
$$SELECT public.publish_hotspots();$$)
ON CONFLICT DO NOTHING;

SELECT cron.schedule('refresh_venue_metrics_hourly', '5 * * * *',
$$SELECT public.refresh_venue_metrics();$$)
ON CONFLICT DO NOTHING;

SELECT cron.schedule('update_venue_popularity_hourly', '7 * * * *',
$$SELECT public.update_venue_popularity();$$)
ON CONFLICT DO NOTHING;

SELECT cron.schedule('update_venue_vibe_scores_hourly', '9 * * * *',
$$SELECT public.update_venue_vibe_scores();$$)
ON CONFLICT DO NOTHING;