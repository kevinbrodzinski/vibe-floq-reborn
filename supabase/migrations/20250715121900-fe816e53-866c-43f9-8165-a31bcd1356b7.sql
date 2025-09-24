/* 0️⃣  Populate momentum view once (keeps scheduler happy) */
REFRESH MATERIALIZED VIEW CONCURRENTLY public.vibe_cluster_momentum;

/* 1️⃣  RPC – geography in, geometry out */
CREATE OR REPLACE FUNCTION public.get_vibe_clusters(
  min_lng      double precision,
  min_lat      double precision,
  max_lng      double precision,
  max_lat      double precision,
  p_precision  integer DEFAULT 6
)
RETURNS TABLE (
  gh6         text,
  centroid    geometry,
  total       bigint,
  vibe_counts jsonb
)
LANGUAGE plpgsql
STABLE PARALLEL SAFE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  effective_precision integer := cluster_precision(p_precision);
  bbox geometry := ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326);
BEGIN
  /* ───── fast path: use materialised view ───── */
  IF effective_precision = 6 THEN
    RETURN QUERY
    SELECT
      vc.gh6,
      vc.centroid::geometry      AS centroid,
      vc.total,
      vc.vibe_counts
    FROM public.vibe_clusters vc
    WHERE vc.centroid::geometry && bbox           -- 👈 cast in WHERE
    ORDER BY vc.total DESC
    LIMIT 1000;

  /* ───── dynamic path: on-the-fly clustering ───── */
  ELSE
    RETURN QUERY
    WITH live AS (
      SELECT
        ST_GeoHash(uvs.location::geometry,
                   effective_precision)          AS gh6,
        uvs.vibe_tag,
        uvs.location::geometry                   AS geom
      FROM public.user_vibe_states uvs
      WHERE uvs.active
        AND uvs.started_at > now() - interval '90 min'
        AND uvs.location IS NOT NULL
        AND uvs.location::geometry && bbox
    ),
    counts AS (
      SELECT
        gh6,
        vibe_tag,
        COUNT(*)                         AS cnt
      FROM live
      GROUP BY gh6, vibe_tag
    )
    SELECT
      gh6,
      ST_SetSRID(                       -- 👈 preserve SRID
        ST_PointOnSurface(
          ST_Collect((SELECT geom FROM live WHERE live.gh6 = counts.gh6))
        ), 4326
      )                                AS centroid,
      SUM(cnt)::bigint                 AS total,
      jsonb_object_agg(vibe_tag, cnt)  AS vibe_counts
    FROM counts
    GROUP BY gh6
    HAVING SUM(cnt) >= 3
    ORDER BY total DESC
    LIMIT 1000;
  END IF;
END;
$$;

/* 2️⃣  Make it callable by your edge functions */
GRANT EXECUTE ON FUNCTION public.get_vibe_clusters TO authenticated;