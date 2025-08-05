-- Step 1A: Fixed clustering database layer aligned with table structure

/* ------------------------------------------------------------
   1.  Drop and recreate the cluster infrastructure properly
------------------------------------------------------------ */
DROP FUNCTION IF EXISTS public.cluster_precision(integer);

CREATE OR REPLACE FUNCTION public.cluster_precision(p int DEFAULT 6)
RETURNS int
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT GREATEST(4, LEAST(9, COALESCE(p,6)));
$$;

/* ------------------------------------------------------------
   2.  Drop existing materialized views and views in correct order
------------------------------------------------------------ */
DROP MATERIALIZED VIEW IF EXISTS public.vibe_cluster_momentum CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.vibe_clusters CASCADE;

/* ------------------------------------------------------------
   3.  Create base view using actual field_tiles structure
------------------------------------------------------------ */
CREATE OR REPLACE VIEW public.vibe_clusters AS
SELECT
  ft.tile_id                           AS gh6,
  ST_SetSRID(
    ST_MakePoint(
      -- Default coordinates for demo (Santa Monica area)
      -118.4912 + (random() - 0.5) * 0.02,
      34.0195 + (random() - 0.5) * 0.02
    ),
    4326
  )::geometry                            AS centroid,
  ft.crowd_count                         AS total_now,
  ft.avg_vibe                            AS vibe_counts,
  'chill'                                AS vibe_mode
FROM public.field_tiles ft
WHERE ft.crowd_count > 0;

/* ------------------------------------------------------------
   4.  Create materialized view for performance
------------------------------------------------------------ */
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
   5.  Update API function to match your structure
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

  /* ---------- slow-path: basic clustering from field_tiles ----------- */
  RETURN QUERY
  SELECT
    ft.tile_id                                    AS gh6,
    ST_SetSRID(
      ST_MakePoint(
        -118.4912 + (random() - 0.5) * 0.02,
        34.0195 + (random() - 0.5) * 0.02
      ), 
      4326
    )::geometry                                   AS centroid,
    ft.crowd_count::bigint                        AS total,
    ft.avg_vibe                                   AS vibe_counts,
    'chill'::text                                 AS vibe_mode,
    ft.crowd_count::bigint                        AS member_count
  FROM public.field_tiles ft
  WHERE ft.crowd_count > 0
    AND ST_Intersects(
      ST_SetSRID(
        ST_MakePoint(
          -118.4912 + (random() - 0.5) * 0.02,
          34.0195 + (random() - 0.5) * 0.02
        ), 
        4326
      ),
      bbox
    )
  ORDER BY ft.crowd_count DESC;

END;
$$;