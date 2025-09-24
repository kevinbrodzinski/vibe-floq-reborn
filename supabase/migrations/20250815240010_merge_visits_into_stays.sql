-- 10: keep RETURNS integer signature, remove nested window calls
CREATE OR REPLACE FUNCTION public.merge_visits_into_stays(_lookback interval DEFAULT '15 minutes')
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','extensions'
AS $function$
DECLARE merged int := 0;
BEGIN
  WITH v AS (
    SELECT * FROM public.venue_visits
    WHERE arrived_at >= now() - _lookback
  ),
  lagged AS (
    SELECT v.*,
           lag(arrived_at) OVER (PARTITION BY profile_id, venue_id ORDER BY arrived_at) AS prev_ts
    FROM v
  ),
  groups AS (
    SELECT *,
           SUM(CASE WHEN prev_ts IS NULL OR arrived_at - prev_ts > interval '10 minutes'
                    THEN 1 ELSE 0 END)
             OVER (PARTITION BY profile_id, venue_id ORDER BY arrived_at) AS grp
    FROM lagged
  ),
  stays AS (
    SELECT profile_id, venue_id,
           MIN(arrived_at) AS arrived_at,
           MAX(arrived_at) AS departed_at,
           AVG(distance_m)::int AS distance_m
    FROM groups
    GROUP BY profile_id, venue_id, grp
  )
  INSERT INTO public.venue_stays (profile_id, venue_id, arrived_at, departed_at, distance_m)
  SELECT * FROM stays
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS merged = ROW_COUNT;
  RETURN merged;
END
$function$;