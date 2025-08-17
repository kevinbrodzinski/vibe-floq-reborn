-- 08: switch user_id -> profile_id
SELECT cron.alter_job(
  16,
  command => $$
WITH active AS (
  SELECT DISTINCT profile_id
  FROM public.daily_afterglow
  WHERE date >= CURRENT_DATE - 7
  LIMIT 100
)
SELECT public.call_weekly_ai_suggestion(profile_id)
FROM active;
$$
);

-- 09: move staging -> main using profile_id + geometry builder
SELECT cron.alter_job(
  27,
  command => $$
WITH ensure AS (
  SELECT public.ensure_location_partition(
           to_char((now() - interval '1 day')::date, 'YYYYMM')
         )
),
moved AS (
  DELETE FROM public.raw_locations_staging s
  WHERE s.captured_at < date_trunc('day', now())
    AND s.profile_id IS NOT NULL
    AND s.lat BETWEEN -90 AND 90
    AND s.lng BETWEEN -180 AND 180
  RETURNING s.profile_id, s.captured_at, s.lat, s.lng, s.acc
),
ins AS (
  INSERT INTO public.raw_locations (profile_id, captured_at, geom, acc)
  SELECT
    m.profile_id,
    m.captured_at,
    ST_SetSRID(ST_MakePoint(m.lng, m.lat), 4326)::geography,
    m.acc
  FROM moved m
  RETURNING 1
)
SELECT COUNT(*) AS rows_moved FROM ins;
$$
);