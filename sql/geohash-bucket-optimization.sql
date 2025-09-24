-- 🔄 Replace the old matcher (safe even if it doesn’t exist)
CREATE OR REPLACE FUNCTION public.match_unmatched_pings()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _since constant interval := '10 minutes';   -- look-back window
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
      ROW_NUMBER()  OVER (PARTITION BY rl.id ORDER BY ST_Distance(rl.geom, v.geom)) AS rn
    FROM  public.raw_locations rl
    JOIN  public.venues       v
          ON  rl.geohash5 = v.geohash5              -- ⚡ bucket pre-filter
         AND ST_DWithin(rl.geom, v.geom, v.radius_m) -- exact check
    WHERE rl.captured_at >= now() - _since
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