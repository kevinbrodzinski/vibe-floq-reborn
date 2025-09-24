-- GPS to venue matching functions with geohash optimization

/* fast matcher: geohash bucket + PostGIS exact check */
CREATE OR REPLACE FUNCTION public.match_unmatched_pings()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _since constant interval := '10 minutes';
  ins    int := 0;
BEGIN
  WITH cte AS (
    SELECT
      rl.id,
      rl.user_id,
      rl.captured_at,
      rl.geom,
      v.id          AS venue_id,
      v.radius_m,
      ST_Distance(rl.geom, v.geom)::numeric AS dist,
      ROW_NUMBER() OVER (PARTITION BY rl.id ORDER BY ST_Distance(rl.geom, v.geom)) AS rn
    FROM  public.raw_locations rl
    JOIN  public.venues       v
          ON  rl.geohash5 = v.geohash5              -- ⚡ bucket pre-filter
         AND ST_DWithin(rl.geom, v.geom, v.radius_m) -- exact check
    WHERE rl.captured_at >= now() - _since
      AND rl.acc <= 50                              -- ⚡ GPS accuracy filter
  )
  INSERT INTO public.venue_visits(user_id, venue_id, arrived_at, distance_m)
  SELECT user_id, venue_id, captured_at, dist
  FROM   cte
  WHERE  rn = 1                                      -- keep closest only
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS ins = ROW_COUNT;
  RETURN ins;
END;
$$;

/* merge venue visits: set departed_at for completed visits */
CREATE OR REPLACE FUNCTION public.merge_venue_visits()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE 
  _updated INT := 0;
BEGIN
  WITH ranked AS (
    SELECT id, user_id, venue_id,
           arrived_at,
           LAG(arrived_at) OVER (PARTITION BY user_id,venue_id ORDER BY arrived_at) AS prev_at
    FROM   public.venue_visits
    WHERE  departed_at IS NULL
      AND  arrived_at < now() - INTERVAL '5 minutes'
  )
  UPDATE public.venue_visits v
     SET departed_at = ranked.arrived_at
  FROM ranked
  WHERE v.id = ranked.id
    AND ranked.prev_at IS NULL;                 -- first row after a gap

  GET DIAGNOSTICS _updated = ROW_COUNT;
  RETURN _updated;
END $$;

/* detect crossed paths between users */
CREATE OR REPLACE FUNCTION public.detect_crossed_paths()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE 
  ins INT;
BEGIN
  INSERT INTO public.crossed_paths(user_a, user_b, venue_id, ts, encounter_date)
  SELECT v1.user_id, v2.user_id, v1.venue_id,
         GREATEST(v1.arrived_at, v2.arrived_at) as encounter_ts,
         v1.day_key as encounter_date
  FROM   public.venue_visits v1
  JOIN   public.venue_visits v2 USING (venue_id, day_key)
  WHERE  v1.user_id < v2.user_id
    AND  COALESCE(v1.departed_at, now()) >
         COALESCE(v2.arrived_at, now())            -- overlap check
    AND  v1.day_key = (current_date - INTERVAL '1 day')::DATE
  ON CONFLICT (user_a, user_b, venue_id, encounter_date) DO NOTHING;
  
  GET DIAGNOSTICS ins = ROW_COUNT;
  RETURN ins;
END $$;

/* optional: grant to anon / authenticated if you expose via RPC */
GRANT EXECUTE ON FUNCTION public.match_unmatched_pings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.merge_venue_visits() TO authenticated;
GRANT EXECUTE ON FUNCTION public.detect_crossed_paths() TO authenticated;