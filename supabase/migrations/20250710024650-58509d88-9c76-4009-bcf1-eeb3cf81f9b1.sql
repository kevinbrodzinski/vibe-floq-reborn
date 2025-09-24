-- Create function to get venues within a cluster's bounding box
CREATE OR REPLACE FUNCTION public.get_cluster_venues (
    min_lng     DOUBLE PRECISION,
    min_lat     DOUBLE PRECISION,
    max_lng     DOUBLE PRECISION,
    max_lat     DOUBLE PRECISION,
    limit_n     INTEGER DEFAULT 10
) RETURNS TABLE (
    id              UUID,
    name            TEXT,
    category        TEXT,
    lat             DOUBLE PRECISION,
    lng             DOUBLE PRECISION,
    vibe_score      NUMERIC,
    live_count      INTEGER,
    check_ins       INTEGER
) LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    v.id,
    v.name,
    COALESCE(v.vibe, 'general')::TEXT     AS category,
    v.lat::DOUBLE PRECISION              AS lat,
    v.lng::DOUBLE PRECISION              AS lng,
    0.0::NUMERIC                         AS vibe_score,  -- placeholder for future
    COALESCE(p.live_count, 0)::INTEGER   AS live_count,
    0::INTEGER                           AS check_ins    -- placeholder for future
  FROM venues v
  LEFT JOIN LATERAL (
        SELECT COUNT(*)::INTEGER AS live_count
        FROM vibes_now vn
        WHERE vn.venue_id = v.id 
          AND vn.expires_at > now()
  ) p ON TRUE
  WHERE v.geo && ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)
  ORDER BY
        p.live_count        DESC,
        v.name             ASC
  LIMIT limit_n;
$$;

GRANT EXECUTE ON FUNCTION public.get_cluster_venues TO authenticated;