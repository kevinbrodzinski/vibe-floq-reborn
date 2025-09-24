-- Fix trade winds schema and refresh function for proper upserts

-- Add ang_bin column to trade_winds for stable lane keys
ALTER TABLE IF EXISTS trade_winds 
  ADD COLUMN IF NOT EXISTS ang_bin INT;

-- Create unique index on the logical key (city, hour, dow, ang_bin)
CREATE UNIQUE INDEX IF NOT EXISTS trade_winds_unique_lane 
  ON trade_winds (city_id, hour_bucket, dow, ang_bin);

-- Add indexes for performance during nightly refresh
CREATE INDEX IF NOT EXISTS flow_samples_city_hour_dow_idx 
  ON flow_samples (city_id, hour_bucket, dow);

CREATE INDEX IF NOT EXISTS flow_samples_recorded_at_idx 
  ON flow_samples (recorded_at);

-- Updated refresh function with proper upsert logic
CREATE OR REPLACE FUNCTION public.refresh_trade_winds_hour(p_city UUID, p_hour INT, p_dow INT)
RETURNS INT LANGUAGE plpgsql AS $$
DECLARE
  inserted INT := 0;
BEGIN
  -- Sample window: last 7 days for same hour/dow
  WITH base AS (
    SELECT cell_x, cell_y,
           AVG(vx)::FLOAT8 AS vx, AVG(vy)::FLOAT8 AS vy,
           SUM(weight)::FLOAT8 AS w
    FROM flow_samples
    WHERE city_id = p_city
      AND hour_bucket = p_hour
      AND dow = p_dow
      AND recorded_at > NOW() - INTERVAL '7 days'
    GROUP BY cell_x, cell_y
  ),
  -- Crude strength filter
  strong AS (
    SELECT *, SQRT(vx*vx+vy*vy) AS speed
    FROM base
    WHERE w >= 5 -- min support
  ),
  -- Path seeds: bucket by angle to derive coarse "lanes"
  seeds AS (
    SELECT *,
      FLOOR((ATAN2(vy, vx) + PI()) / (PI()/6)) AS ang_bin   -- 12 bins
    FROM strong
  ),
  paths AS (
    SELECT ang_bin,
           JSONB_AGG(JSONB_BUILD_OBJECT('x',cell_x,'y',cell_y,'vx',vx,'vy',vy,'w',w)) AS points,
           AVG(speed) AS avg_speed,
           SUM(w) AS support
    FROM seeds
    GROUP BY ang_bin
    HAVING COUNT(*) >= 4
  )
  INSERT INTO trade_winds(
    city_id, hour_bucket, dow, ang_bin,
    path_id, points, strength, avg_speed, support, updated_at
  )
  SELECT 
    p_city, p_hour, p_dow, ang_bin,
    GEN_RANDOM_UUID() AS path_id, -- only generated on insert
    points,
    LEAST(1.0, support/50.0) AS strength,
    avg_speed,
    support,
    NOW()
  FROM paths
  ON CONFLICT (city_id, hour_bucket, dow, ang_bin)
  DO UPDATE SET
    points      = EXCLUDED.points,
    strength    = EXCLUDED.strength,
    avg_speed   = EXCLUDED.avg_speed,
    support     = EXCLUDED.support,
    updated_at  = NOW();

  GET DIAGNOSTICS inserted = ROW_COUNT;
  RETURN inserted;
END$$;

-- Keep the refresh_trade_winds_all function as-is since it just calls the hour function
CREATE OR REPLACE FUNCTION public.refresh_trade_winds_all(p_city UUID)
RETURNS INT LANGUAGE plpgsql AS $$
DECLARE
  total INT := 0;
  h INT;
  d INT;
BEGIN
  FOR h IN 0..23 LOOP
    FOR d IN 0..6 LOOP
      total := total + public.refresh_trade_winds_hour(p_city, h, d);
    END LOOP;
  END LOOP;
  RETURN total;
END$$;