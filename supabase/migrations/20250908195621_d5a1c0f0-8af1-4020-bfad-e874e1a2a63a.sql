-- Trade Winds nightly refresh job
-- Converts flow_samples into trade_winds with clustering and path fitting

-- 1) Function to refresh trade winds for a specific hour/dow combination
CREATE OR REPLACE FUNCTION public.refresh_trade_winds_hour(p_city uuid, p_hour int, p_dow int)
RETURNS int 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  inserted int := 0;
BEGIN
  -- Sample window: last 7 days for same hour/dow
  WITH base AS (
    SELECT cell_x, cell_y,
           avg(vx)::float8 as vx, 
           avg(vy)::float8 as vy,
           sum(weight)::float8 as w
    FROM flow_samples
    WHERE city_id = p_city
      AND hour_bucket = p_hour
      AND dow = p_dow
      AND recorded_at > now() - interval '7 days'
    GROUP BY cell_x, cell_y
  ),
  -- Crude strength filter
  strong AS (
    SELECT *, sqrt(vx*vx+vy*vy) as speed
    FROM base
    WHERE w >= 5 -- min support
  ),
  -- Path seeds: bucket by angle to derive coarse "lanes"
  seeds AS (
    SELECT *,
      floor((atan2(vy, vx) + pi()) / (pi()/6)) as ang_bin   -- 12 bins
    FROM strong
  ),
  paths AS (
    SELECT ang_bin,
           jsonb_agg(jsonb_build_object('x',cell_x,'y',cell_y,'vx',vx,'vy',vy,'w',w)) as points,
           avg(speed) as avg_speed,
           sum(w) as support
    FROM seeds
    GROUP BY ang_bin
    HAVING count(*) >= 4
  )
  INSERT INTO trade_winds(city_id, hour_bucket, dow, path_id, points, strength, avg_speed, support, updated_at)
  SELECT p_city, p_hour, p_dow,
         gen_random_uuid(),
         points,
         least(1.0, support/50.0) as strength,
         avg_speed,
         support,
         now()
  FROM paths
  ON CONFLICT (city_id, hour_bucket, dow, path_id) 
  DO UPDATE SET
     points = EXCLUDED.points, 
     strength = EXCLUDED.strength, 
     avg_speed = EXCLUDED.avg_speed, 
     support = EXCLUDED.support, 
     updated_at = now();

  GET DIAGNOSTICS inserted = ROW_COUNT;
  RETURN inserted;
END;
$$;

-- 2) Function to refresh all hour/dow buckets for a city
CREATE OR REPLACE FUNCTION public.refresh_trade_winds_all(p_city uuid)
RETURNS int 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  total int := 0;
  h int;
  d int;
BEGIN
  FOR h IN 0..23 LOOP
    FOR d IN 0..6 LOOP
      total := total + public.refresh_trade_winds_hour(p_city, h, d);
    END LOOP;
  END LOOP;
  RETURN total;
END;
$$;