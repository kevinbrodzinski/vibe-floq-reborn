-- Friend Trails & Close-Encounters Module
-- Extends existing location pipeline with social trail tracking and encounter detection

-- 1. Materialized view for friend trails (last 50 points per friend)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.friend_last_points AS
SELECT DISTINCT ON (user_id, captured_at)
       user_id,
       captured_at,
       ST_Y(geom::geometry) AS lat,
       ST_X(geom::geometry) AS lng
FROM   public.raw_locations
ORDER  BY user_id, captured_at DESC
LIMIT  50
WITH DATA;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_friend_last_points_user_time 
ON public.friend_last_points (user_id, captured_at DESC);

-- Refresh helper function
CREATE OR REPLACE FUNCTION public.refresh_friend_last_points()
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.friend_last_points;
END;
$$;

-- 2. Close-encounter tracking table
CREATE TABLE IF NOT EXISTS public.user_encounter (
  id           bigserial PRIMARY KEY,
  user_a       uuid NOT NULL,
  user_b       uuid NOT NULL,
  first_seen   timestamptz NOT NULL,
  last_seen    timestamptz NOT NULL,
  venue_id     uuid,                  -- nullable (street encounter)
  created_at   timestamptz DEFAULT now(),
  CONSTRAINT unique_pair UNIQUE (user_a, user_b, first_seen)
);

-- Enable RLS on encounters
ALTER TABLE public.user_encounter ENABLE ROW LEVEL SECURITY;

-- Users can see encounters they participated in
CREATE POLICY "users_see_own_encounters" 
ON public.user_encounter 
FOR SELECT 
USING ((user_a = auth.uid()) OR (user_b = auth.uid()));

-- Service role can insert encounters
CREATE POLICY "service_can_insert_encounters" 
ON public.user_encounter 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role');

-- 3. Close-encounter detection function
CREATE OR REPLACE FUNCTION public.cross_path_scan()
RETURNS int 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = 'public'
AS $$
DECLARE
  ins int;
BEGIN
  WITH recent AS (
    SELECT user_id, captured_at, geom
    FROM   public.raw_locations
    WHERE  captured_at >= now() - interval '5 minutes'
      AND  acc <= 50           -- use same accuracy filter
  ),
  pairs AS (
    SELECT r1.user_id  AS a,
           r2.user_id  AS b,
           GREATEST(r1.captured_at, r2.captured_at) AS seen_at,
           ST_Distance(r1.geom, r2.geom) AS dist_m
    FROM   recent r1
    JOIN   recent r2
           ON  r1.user_id < r2.user_id  -- ensure ordered pairs to avoid duplicates
          AND r1.captured_at BETWEEN r2.captured_at - interval '90 seconds'
                                 AND r2.captured_at + interval '90 seconds'
          AND ST_DWithin(r1.geom, r2.geom, 40)     -- 40m proximity
  ),
  grouped AS (
    SELECT a, b,
           MIN(seen_at) AS first_seen,
           MAX(seen_at) AS last_seen
    FROM   pairs
    GROUP  BY 1, 2
    HAVING MAX(seen_at) - MIN(seen_at) >= interval '3 minutes'  -- linger ≥3 min
  )
  INSERT INTO public.user_encounter(user_a, user_b, first_seen, last_seen)
  SELECT a, b, first_seen, last_seen
  FROM   grouped
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS ins = ROW_COUNT;
  RETURN ins;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.refresh_friend_last_points() TO service_role;
GRANT EXECUTE ON FUNCTION public.cross_path_scan() TO service_role;