-- Single enriched RPC for flow venue search with friend/sun boosting
-- Combines search + count + boost + sort into one server-side operation

CREATE OR REPLACE FUNCTION public.search_flow_venues_enriched(
  bbox_geojson        jsonb   DEFAULT NULL,
  center_lat          double precision DEFAULT NULL,
  center_lng          double precision DEFAULT NULL,
  radius_m            integer DEFAULT 1000,
  since_minutes       integer DEFAULT 45,
  include_friend_boost boolean DEFAULT FALSE,
  wants_sun           boolean DEFAULT FALSE,
  limit_n             integer DEFAULT 200
)
RETURNS TABLE (
  id           uuid,
  name         text,
  category     text,
  lat          double precision,
  lng          double precision,
  busy_band    integer,
  friend_count bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
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
        ST_MakeEnvelope(-180,-90,180,90,4326)
      ) AS g
  ),
  v AS (
    SELECT
      vn.id,
      vn.name,
      (vn.categories)[1]::text AS category,
      vn.categories::text[]     AS cats,
      vn.lat, vn.lng,
      COALESCE(vn.geom, ST_SetSRID(ST_MakePoint(vn.lng, vn.lat), 4326)) AS vgeom
    FROM public.venues vn
    WHERE vn.lat IS NOT NULL AND vn.lng IS NOT NULL
  ),
  in_area AS (
    SELECT v.id, v.name, v.category, v.cats, v.lat, v.lng
    FROM v
    JOIN env ON TRUE
    WHERE ST_Intersects(v.vgeom, env.g)
  ),
  -- Recent flow activity counts (window)
  flow_counts AS (
    SELECT
      fs.venue_id,
      COUNT(*)::bigint AS cnt
    FROM public.flow_segments fs
    WHERE fs.venue_id IS NOT NULL
      AND fs.arrived_at >= (NOW() - MAKE_INTERVAL(mins => since_minutes))
    GROUP BY fs.venue_id
  ),
  -- Friend flow counts, using accepted friendships vs auth.uid()
  my_friends AS (
    SELECT CASE
             WHEN f.profile_low = auth.uid() THEN f.profile_high
             ELSE f.profile_low
           END AS friend_id
    FROM public.friendships f
    WHERE f.friend_state = 'accepted'
      AND (f.profile_low = auth.uid() OR f.profile_high = auth.uid())
  ),
  friend_flow AS (
    SELECT
      fs.venue_id,
      COUNT(DISTINCT fl.profile_id)::bigint AS friend_count
    FROM public.flows fl
    JOIN my_friends fr ON fr.friend_id = fl.profile_id
    JOIN public.flow_segments fs ON fs.flow_id = fl.id
    WHERE fs.venue_id IS NOT NULL
      AND fs.arrived_at >= (NOW() - MAKE_INTERVAL(mins => since_minutes))
    GROUP BY fs.venue_id
  ),
  merged AS (
    SELECT
      ia.id,
      ia.name,
      ia.category,
      ia.cats,
      ia.lat,
      ia.lng,
      COALESCE(fc.cnt, 0) AS cnt,
      COALESCE(ff.friend_count, 0) AS friend_count
    FROM in_area ia
    LEFT JOIN flow_counts fc ON fc.venue_id = ia.id
    LEFT JOIN friend_flow  ff ON ff.venue_id = ia.id
  ),
  scored AS (
    SELECT
      m.*,
      -- Busy band from total recent flow hits
      CASE
        WHEN m.cnt = 0 THEN 0
        WHEN m.cnt = 1 THEN 1
        WHEN m.cnt <= 3 THEN 2
        WHEN m.cnt <= 6 THEN 3
        ELSE 4
      END AS busy_band,
      -- Simple "sun friendly" score from categories text[]
      CASE
        WHEN wants_sun
         AND m.cats && ARRAY['patio','beer garden','rooftop','outdoor','park','beach']::text[]
        THEN 1 ELSE 0
      END AS sun_score
    FROM merged m
  )
  SELECT
    s.id, s.name, s.category, s.lat, s.lng,
    s.busy_band,
    s.friend_count
  FROM scored s
  ORDER BY
    -- Friend boost first if requested
    (CASE WHEN include_friend_boost THEN s.friend_count ELSE 0 END) DESC,
    -- Then sun alignment if requested
    (CASE WHEN wants_sun THEN s.sun_score ELSE 0 END) DESC,
    -- Then busy band
    s.busy_band DESC,
    -- Stable tie break to prevent flicker
    s.name ASC
  LIMIT GREATEST(1, LEAST(limit_n, 500));
$$;

-- Optional helper view for outdoor scoring reusability
CREATE OR REPLACE VIEW public.venue_is_outdoor AS
SELECT
  vn.id,
  (vn.categories && ARRAY['patio','beer garden','rooftop','outdoor','park','beach']::text[]) AS outdoorish
FROM public.venues vn;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.search_flow_venues_enriched(jsonb,double precision,double precision,integer,integer,boolean,boolean,integer) TO anon, authenticated;
GRANT SELECT ON public.venue_is_outdoor TO anon, authenticated;