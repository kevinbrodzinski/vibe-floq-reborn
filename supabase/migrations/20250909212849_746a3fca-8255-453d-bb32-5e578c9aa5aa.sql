-- Flow system RPCs for venue counts, friend venue counts, and convergence detection

-- 1) Venue flow counts in last N minutes
CREATE OR REPLACE FUNCTION public.get_venue_flow_counts(since_timestamp timestamptz)
RETURNS TABLE(venue_id uuid, count bigint)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT fs.venue_id, COUNT(*)::bigint
  FROM public.flow_segments fs
  WHERE fs.arrived_at >= since_timestamp
    AND fs.venue_id IS NOT NULL
  GROUP BY fs.venue_id;
$$;

-- 2) Friend venue counts in last N minutes (friends of current profile)
CREATE OR REPLACE FUNCTION public.recent_friend_venue_counts(profile uuid, since timestamptz)
RETURNS TABLE(venue_id uuid, friend_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH friends AS (
    SELECT CASE
      WHEN f.profile_low = profile THEN f.profile_high
      ELSE f.profile_low
    END AS friend_id
    FROM public.friendships f
    WHERE f.friend_state = 'accepted'
      AND (f.profile_low = profile OR f.profile_high = profile)
  )
  SELECT fs.venue_id, COUNT(DISTINCT fl.profile_id)::bigint AS friend_count
  FROM public.flow_segments fs
  JOIN public.flows fl ON fl.id = fs.flow_id
  WHERE fl.profile_id IN (SELECT friend_id FROM friends)
    AND fs.arrived_at >= since
    AND fs.venue_id IS NOT NULL
  GROUP BY fs.venue_id;
$$;

-- 3) Recent convergence cells (bins) using geometric clustering
CREATE OR REPLACE FUNCTION public.recent_convergence(
  west double precision,
  south double precision, 
  east double precision,
  north double precision,
  since timestamptz,
  res int DEFAULT 9
)
RETURNS TABLE(lng double precision, lat double precision, group_min int, prob double precision, eta_min int)
LANGUAGE sql STABLE SECURITY DEFINER  
SET search_path = public
AS $$
  WITH recent_segments AS (
    SELECT 
      ST_X(fs.center::geometry) AS lng,
      ST_Y(fs.center::geometry) AS lat,
      fs.flow_id
    FROM public.flow_segments fs
    WHERE fs.arrived_at >= since
      AND fs.center IS NOT NULL
      AND ST_X(fs.center::geometry) BETWEEN west AND east
      AND ST_Y(fs.center::geometry) BETWEEN south AND north
  ),
  grid_cells AS (
    SELECT 
      FLOOR(lng * 1000) / 1000 AS grid_lng,
      FLOOR(lat * 1000) / 1000 AS grid_lat,
      COUNT(DISTINCT flow_id)::int AS n
    FROM recent_segments
    GROUP BY FLOOR(lng * 1000), FLOOR(lat * 1000)
  )
  SELECT
    grid_lng AS lng, 
    grid_lat AS lat,
    n AS group_min,
    GREATEST(0.25, LEAST(0.95, 0.25 + 0.12 * n))::double precision AS prob,
    GREATEST(3, 15 - LEAST(10, (n/2)::int))::int AS eta_min
  FROM grid_cells
  WHERE n >= 2
  ORDER BY n DESC
  LIMIT 50;
$$;

-- 4) Search venues inside bbox (fallback) - using correct column names
CREATE OR REPLACE FUNCTION public.search_venues_bbox(
  bbox_geojson jsonb,
  center_lat double precision DEFAULT NULL,
  center_lng double precision DEFAULT NULL, 
  radius_m double precision DEFAULT 1000
)
RETURNS TABLE(id uuid, name text, category text, open_now boolean)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    v.id, 
    v.name, 
    COALESCE(v.categories->0->>'name', 'unknown')::text AS category,
    v.open_now
  FROM public.venues v
  WHERE ST_Contains(
          ST_GeomFromGeoJSON(bbox_geojson::text)::geometry,
          ST_SetSRID(ST_MakePoint(v.lng, v.lat), 4326)
        );
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_venue_flow_counts(timestamptz) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recent_friend_venue_counts(uuid, timestamptz) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recent_convergence(double precision,double precision,double precision,double precision,timestamptz,int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_venues_bbox(jsonb,double precision,double precision,double precision) TO anon, authenticated;