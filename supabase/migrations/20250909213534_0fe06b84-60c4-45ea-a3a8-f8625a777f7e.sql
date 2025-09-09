-- Corrected Flow system RPCs that match actual schema
-- venues.categories is text[], no open_now column, flow_segments.center is NOT NULL

-- 1) Search venues within bbox OR center+radius
CREATE OR REPLACE FUNCTION public.search_venues_bbox(
  bbox_geojson jsonb DEFAULT NULL,
  center_lat  double precision DEFAULT NULL,
  center_lng  double precision DEFAULT NULL,
  radius_m    integer DEFAULT 1000
)
RETURNS TABLE (
  id        uuid,
  name      text,
  category  text,
  lat       double precision,
  lng       double precision
)
LANGUAGE sql
STABLE
AS $$
  WITH env AS (
    SELECT
      COALESCE(
        CASE
          WHEN bbox_geojson IS NOT NULL
            THEN ST_SetSRID(ST_GeomFromGeoJSON(bbox_geojson::text), 4326)
          WHEN center_lat IS NOT NULL AND center_lng IS NOT NULL
            THEN ST_Transform(
                   ST_Buffer(
                     ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326)::geography,
                     GREATEST(50, LEAST(5000, radius_m))
                   )::geometry,
                   4326
                 )
          ELSE NULL
        END,
        -- final fallback: world envelope to avoid null env
        ST_MakeEnvelope(-180,-90,180,90,4326)
      ) AS g
  ),
  v AS (
    SELECT
      vn.id,
      vn.name,
      (vn.categories)[1]::text AS category,
      vn.lat,
      vn.lng,
      COALESCE(vn.geom, ST_SetSRID(ST_MakePoint(vn.lng, vn.lat), 4326)) AS vgeom
    FROM public.venues vn
    WHERE vn.lat IS NOT NULL AND vn.lng IS NOT NULL
  )
  SELECT v.id, v.name, v.category, v.lat, v.lng
  FROM v
  JOIN env ON TRUE
  WHERE ST_Intersects(v.vgeom, env.g);
$$;

-- 2) Get venue flow counts (recent activity)
CREATE OR REPLACE FUNCTION public.get_venue_flow_counts(
  since_timestamp timestamptz
)
RETURNS TABLE (
  venue_id uuid,
  count    bigint
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    fs.venue_id,
    COUNT(*)::bigint AS count
  FROM public.flow_segments fs
  WHERE fs.venue_id IS NOT NULL
    AND fs.arrived_at >= since_timestamp
  GROUP BY fs.venue_id;
$$;

-- 3) Recent friend venue counts
CREATE OR REPLACE FUNCTION public.recent_friend_venue_counts(
  profile uuid,
  since   timestamptz
)
RETURNS TABLE (
  venue_id     uuid,
  friend_count bigint
)
LANGUAGE sql
STABLE
AS $$
  WITH friends AS (
    SELECT CASE
             WHEN f.profile_low = profile THEN f.profile_high
             ELSE f.profile_low
           END AS friend_id
    FROM public.friendships f
    WHERE f.friend_state = 'accepted'
      AND (f.profile_low = profile OR f.profile_high = profile)
  ),
  friend_flows AS (
    SELECT fl.id AS flow_id, fl.profile_id
    FROM public.flows fl
    JOIN friends fr ON fr.friend_id = fl.profile_id
    WHERE fl.started_at >= (since - INTERVAL '7 days') -- safety window
  ),
  hits AS (
    SELECT
      fs.venue_id,
      ff.profile_id
    FROM public.flow_segments fs
    JOIN friend_flows ff ON ff.flow_id = fs.flow_id
    WHERE fs.arrived_at >= since
      AND fs.venue_id IS NOT NULL
  )
  SELECT
    h.venue_id,
    COUNT(DISTINCT h.profile_id)::bigint AS friend_count
  FROM hits h
  GROUP BY h.venue_id;
$$;

-- 4) Recent convergence clustering
CREATE OR REPLACE FUNCTION public.recent_convergence(
  west   double precision,
  south  double precision,
  east   double precision,
  north  double precision,
  since  timestamptz,
  res    integer DEFAULT 9  -- logical "density"; mapped to meters
)
RETURNS TABLE (
  lng       double precision,
  lat       double precision,
  group_min integer,
  prob      double precision,
  eta_min   integer
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  env    geometry;
  -- map "res" (7..11) to approximate clustering distance (meters)
  cluster_m integer := CASE
    WHEN res <= 7 THEN 1600
    WHEN res =  8 THEN 900
    WHEN res =  9 THEN 500
    WHEN res >= 10 THEN 300
  END;
BEGIN
  env := ST_MakeEnvelope(west, south, east, north, 4326);

  RETURN QUERY
  WITH segs AS (
    SELECT fs.center::geography AS g
    FROM public.flow_segments fs
    WHERE fs.arrived_at >= since
      AND ST_Intersects(fs.center, env)
  ),
  cl AS (
    -- Each row: one cluster geometry (geography)
    SELECT unnest(ST_ClusterWithin(g, cluster_m)) AS cg
    FROM segs
  ),
  features AS (
    SELECT
      ST_X(ST_Centroid(ST_Collect(cg::geometry)))::double precision AS lng,
      ST_Y(ST_Centroid(ST_Collect(cg::geometry)))::double precision AS lat,
      ST_NumGeometries(cg::geometry) AS n
    FROM cl
    GROUP BY cg
  )
  SELECT
    f.lng,
    f.lat,
    f.n AS group_min,
    GREATEST(0.25, LEAST(0.95, 0.25 + 0.12 * f.n))::double precision AS prob,
    GREATEST(3, 15 - LEAST(10, f.n / 2))::integer         AS eta_min
  FROM features f
  WHERE f.n >= 3
  ORDER BY f.n DESC
  LIMIT 120;
END;
$$;

-- Performance indexes (geom is auto-generated, so index should already exist or will be created automatically)
CREATE INDEX IF NOT EXISTS flow_segments_center_gix ON public.flow_segments USING GIST (center);
CREATE INDEX IF NOT EXISTS flow_segments_arrived_at_idx ON public.flow_segments (arrived_at);
CREATE INDEX IF NOT EXISTS friendships_low_high_idx ON public.friendships (profile_low, profile_high);
CREATE INDEX IF NOT EXISTS friendships_state_idx ON public.friendships (friend_state);

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.search_venues_bbox(jsonb,double precision,double precision,integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_venue_flow_counts(timestamptz) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recent_friend_venue_counts(uuid,timestamptz) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recent_convergence(double precision,double precision,double precision,double precision,timestamptz,integer) TO anon, authenticated;