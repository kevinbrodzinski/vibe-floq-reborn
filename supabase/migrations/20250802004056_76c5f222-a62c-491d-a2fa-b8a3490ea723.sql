-- Step 1A: Fixed clustering database layer aligned with table structure

/* ------------------------------------------------------------
   1.  Drop existing function and recreate with correct structure
------------------------------------------------------------ */
DROP FUNCTION IF EXISTS public.cluster_precision(integer);

CREATE OR REPLACE FUNCTION public.cluster_precision(p int DEFAULT 6)
RETURNS int
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT GREATEST(4, LEAST(9, COALESCE(p,6)));
$$;

/* ------------------------------------------------------------
   2.  BASE VIEW: real-time clusters using actual field_tiles structure
------------------------------------------------------------ */
DROP VIEW IF EXISTS public.vibe_clusters CASCADE;

CREATE OR REPLACE VIEW public.vibe_clusters AS
SELECT
  ft.tile_id                           AS gh6,
  ST_SetSRID(
    ST_MakePoint(
      -- Extract coordinates from tile_id (assuming H3 format)
      CASE 
        WHEN length(ft.tile_id) >= 10 AND ft.tile_id ~ '^[0-9a-f]+$' THEN 
          COALESCE(ST_X(ST_Centroid(h3_cell_to_boundary_geometry(ft.tile_id))), 0.0)
        ELSE 
          -- Fallback for non-H3 tile_ids: simple grid coordinate extraction
          CASE 
            WHEN ft.tile_id ~ '^[0-9]+$' THEN
              ((substring(ft.tile_id from 1 for LEAST(length(ft.tile_id)/2, 6))::numeric % 1000) - 500) * 0.001
            ELSE 0.0
          END
      END,
      CASE 
        WHEN length(ft.tile_id) >= 10 AND ft.tile_id ~ '^[0-9a-f]+$' THEN 
          COALESCE(ST_Y(ST_Centroid(h3_cell_to_boundary_geometry(ft.tile_id))), 0.0)
        ELSE 
          CASE 
            WHEN ft.tile_id ~ '^[0-9]+$' THEN
              ((substring(ft.tile_id from LEAST(length(ft.tile_id)/2, 6)+1)::numeric % 1000) - 500) * 0.001
            ELSE 0.0
          END
      END
    ),
    4326
  )::geometry                            AS centroid,
  ft.crowd_count                         AS total_now,
  ft.avg_vibe                            AS vibe_counts,
  'chill'                                AS vibe_mode
FROM public.field_tiles ft
WHERE ft.crowd_count > 0;

/* ------------------------------------------------------------
   3.  MATERIALISED VIEW: snapshot for fast queries
------------------------------------------------------------ */
DROP MATERIALIZED VIEW IF EXISTS public.vibe_cluster_momentum CASCADE;

CREATE MATERIALIZED VIEW public.vibe_cluster_momentum AS
SELECT *
FROM public.vibe_clusters;

-- Refresh helper function
CREATE OR REPLACE FUNCTION public.refresh_vibe_cluster_momentum()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.vibe_cluster_momentum;
EXCEPTION WHEN OTHERS THEN
  -- Fallback to non-concurrent refresh if concurrent fails
  REFRESH MATERIALIZED VIEW public.vibe_cluster_momentum;
END;
$$;

-- Create spatial index
CREATE INDEX IF NOT EXISTS vibe_cluster_momentum_geom_idx
  ON public.vibe_cluster_momentum
  USING GIST (centroid);

/* ------------------------------------------------------------
   4.  UPDATED API FUNCTION: get_vibe_clusters
------------------------------------------------------------ */
CREATE OR REPLACE FUNCTION public.get_vibe_clusters(
  min_lng double precision,
  min_lat double precision,
  max_lng double precision,
  max_lat double precision,
  p_precision integer DEFAULT 6
)
RETURNS TABLE(
  gh6          text,
  centroid     geometry,
  total        bigint,
  vibe_counts  jsonb,
  vibe_mode    text,
  member_count bigint
)
LANGUAGE plpgsql STABLE
SET search_path = public
AS $$
DECLARE
  eff_precision int   := public.cluster_precision(p_precision);
  bbox          geometry := ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326);
BEGIN

  /* ---------- fast-path: use materialised view when p=6 -------------- */
  IF eff_precision = 6 THEN
    RETURN QUERY
    SELECT
      mv.gh6,
      mv.centroid,
      mv.total_now::bigint     AS total,
      mv.vibe_counts,
      mv.vibe_mode,
      mv.total_now::bigint     AS member_count
    FROM   public.vibe_cluster_momentum mv
    WHERE  ST_Intersects(mv.centroid, bbox);
    RETURN;
  END IF;

  /* ---------- slow-path: build clusters from field_tiles ------------- */
  RETURN QUERY
  WITH tiles AS (
    SELECT
      tile_id,
      crowd_count,
      avg_vibe,
      ST_SetSRID(
        ST_MakePoint(
          CASE 
            WHEN length(tile_id) >= 10 AND tile_id ~ '^[0-9a-f]+$' THEN 
              COALESCE(ST_X(ST_Centroid(h3_cell_to_boundary_geometry(tile_id))), 0.0)
            ELSE 
              CASE 
                WHEN tile_id ~ '^[0-9]+$' THEN
                  ((substring(tile_id from 1 for LEAST(length(tile_id)/2, 6))::numeric % 1000) - 500) * 0.001
                ELSE 0.0
              END
          END,
          CASE 
            WHEN length(tile_id) >= 10 AND tile_id ~ '^[0-9a-f]+$' THEN 
              COALESCE(ST_Y(ST_Centroid(h3_cell_to_boundary_geometry(tile_id))), 0.0)
            ELSE 
              CASE 
                WHEN tile_id ~ '^[0-9]+$' THEN
                  ((substring(tile_id from LEAST(length(tile_id)/2, 6)+1)::numeric % 1000) - 500) * 0.001
                ELSE 0.0
              END
          END
        ),
        4326
      ) AS point_geom
    FROM   public.field_tiles
    WHERE  crowd_count > 0
  ),
  filtered_tiles AS (
    SELECT * FROM tiles 
    WHERE ST_Intersects(point_geom, bbox)
  ),
  clusters AS (
    SELECT
      substring(tile_id, 1, GREATEST(3, length(tile_id) - 2)) AS gh6,
      SUM(crowd_count)::bigint                                AS total,
      ST_Centroid(ST_Collect(point_geom))                     AS centroid,
      jsonb_build_object('total', SUM(crowd_count))           AS vibe_counts
    FROM   filtered_tiles
    GROUP  BY substring(tile_id, 1, GREATEST(3, length(tile_id) - 2))
    HAVING SUM(crowd_count) >= 3
  )
  SELECT
    clusters.gh6,
    clusters.centroid,
    clusters.total,
    clusters.vibe_counts,
    'chill'::text                        AS vibe_mode,
    clusters.total                       AS member_count
  FROM clusters
  ORDER BY clusters.total DESC;

END;
$$;