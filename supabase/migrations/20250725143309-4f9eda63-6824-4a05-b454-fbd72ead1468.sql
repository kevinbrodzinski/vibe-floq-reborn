/* ================================================================
   M20250725-b – replace get_vibe_clusters with v2 (adds vibe_mode)
   ================================================================ */

-- 1️⃣  Drop the old definition (arg list must match exactly)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM   pg_proc p
    JOIN   pg_namespace n ON n.oid = p.pronamespace
    WHERE  n.nspname = 'public'
    AND    p.proname = 'get_vibe_clusters'
    AND    pg_get_function_identity_arguments(p.oid)
           = 'min_lng double precision, min_lat double precision, max_lng double precision, max_lat double precision, p_precision integer'
  ) THEN
    EXECUTE 'DROP FUNCTION public.get_vibe_clusters(
               double precision, double precision, double precision,
               double precision, integer
             )';
  END IF;
END$$;


-- 2️⃣  Install v2  ▸ fast-path keeps momentum MV ▸ slow-path builds on the fly
CREATE FUNCTION public.get_vibe_clusters(
  min_lng      double precision,
  min_lat      double precision,
  max_lng      double precision,
  max_lat      double precision,
  p_precision  integer DEFAULT 6            -- 6 = ~1 km
)
RETURNS TABLE (
  gh6          text,
  centroid     geometry,
  total        bigint,
  vibe_counts  jsonb,
  vibe_mode    text,
  member_count bigint
)
LANGUAGE plpgsql
SECURITY INVOKER
SET row_security = off                     -- needed for fast-path view
AS $$
DECLARE
  eff_precision integer := cluster_precision(p_precision);
  bbox            geometry := ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326);
BEGIN
  /* ── Fast-path: pre-aggregated MV at precision 6 ─────────────────────── */
  IF eff_precision = 6 THEN
    RETURN QUERY
    SELECT
      mv.gh6,
      mv.centroid::geometry,
      mv.total,
      mv.vibe_counts,
      COALESCE(
        (SELECT key FROM jsonb_each_text(mv.vibe_counts)
         ORDER BY value::bigint DESC LIMIT 1),
        'chill'
      )               AS vibe_mode,
      mv.total        AS member_count
    FROM   public.vibe_cluster_momentum mv
    WHERE  ST_Intersects(mv.centroid, bbox);
    RETURN;
  END IF;

  /* ── Slow-path: build clusters ad-hoc for other precisions ───────────── */
  RETURN QUERY
  WITH tiles AS (
    SELECT tile_id, crowd_count, avg_vibe
    FROM   field_tiles
    WHERE  length(tile_id) = (15 - eff_precision)
      AND  crowd_count > 0
      AND  ST_Intersects(
             ST_SetSRID(h3_cell_to_boundary_geometry(tile_id), 4326), bbox)
  ),
  clusters AS (
    SELECT
      substring(tile_id, 1, 15 - eff_precision)          AS gh6,
      SUM(crowd_count)                                   AS total,
      ST_Centroid(
        ST_Union(
          ST_SetSRID(h3_cell_to_boundary_geometry(tile_id), 4326)
        )
      )                                                  AS centroid,
      jsonb_object_agg(
        COALESCE((avg_vibe->>'h')::text, 'unknown'),
        SUM(crowd_count)
      )                                                  AS vibe_counts
    FROM tiles
    GROUP BY substring(tile_id, 1, 15 - eff_precision)
    HAVING SUM(crowd_count) >= 3
  )
  SELECT
    gh6,
    centroid,
    total,
    COALESCE(vibe_counts, '{}'::jsonb),
    (SELECT key FROM jsonb_each_text(vibe_counts)
      ORDER BY value::bigint DESC LIMIT 1)               AS vibe_mode,
    total                                                AS member_count
  FROM clusters
  ORDER BY total DESC;
END;
$$;


-- 3️⃣  (optional) comment for clarity
COMMENT ON FUNCTION public.get_vibe_clusters IS
'Returns hex-grid clusters inside a bbox with dominant vibe & head-count. Fast-path for precision 6 pulls from vibe_cluster_momentum.';