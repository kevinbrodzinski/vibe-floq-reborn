-- Migration 2: Geo helpers without H3 dependency for precise convergence detection
BEGIN;

-- Create venue view exposing lng/lat from existing columns
CREATE OR REPLACE VIEW public.v_venues_ll AS
SELECT
  v.id,
  v.name,
  COALESCE(v.categories[1], 'unknown') as category,
  NULL::boolean as open_now,
  v.lng::double precision AS lng,
  v.lat::double precision AS lat
FROM public.venues v
WHERE v.lng IS NOT NULL AND v.lat IS NOT NULL
WITH LOCAL CHECK OPTION;

-- Recent convergence aggregator using spatial grid clustering
-- Clusters flow segments by spatial proximity and returns precise centroids
CREATE OR REPLACE FUNCTION public.recent_convergence(
  west  double precision,
  south double precision,
  east  double precision,
  north double precision,
  since timestamptz
)
RETURNS TABLE (
  h3_key text,
  lng    double precision,
  lat    double precision,
  n      integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
WITH seg AS (
  SELECT h3_idx, center
  FROM   public.flow_segments
  WHERE  arrived_at >= since
  AND    center && ST_MakeEnvelope(west, south, east, north, 4326)
),
bucketed AS (
  SELECT
    CASE
      WHEN h3_idx IS NOT NULL THEN h3_idx
      ELSE 'grid:' ||
           round(ST_X(center)::numeric, 3) || ':' ||
           round(ST_Y(center)::numeric, 3)
    END AS key,
    h3_idx,
    center
  FROM seg
),
agg AS (
  SELECT
    key,
    h3_idx,
    COUNT(*) AS n,
    ST_X(ST_Centroid(ST_Collect(center)))::double precision AS lng,
    ST_Y(ST_Centroid(ST_Collect(center)))::double precision AS lat
  FROM bucketed
  GROUP BY 1,2
)
SELECT
  agg.key AS h3_key,
  agg.lng,
  agg.lat,
  agg.n
FROM agg
WHERE n >= 3            -- minimum cluster size
ORDER BY n DESC
LIMIT 64;               -- cap to keep payload small
$$;

-- Venue search RPC for geometry-safe lookups
CREATE OR REPLACE FUNCTION public.search_venues_bbox(
  west  double precision,
  south double precision,
  east  double precision,
  north double precision,
  q     text DEFAULT NULL,         -- optional substring filter
  lim   integer DEFAULT 200
)
RETURNS TABLE (
  id        uuid,
  name      text,
  category  text,
  open_now  boolean,
  lng       double precision,
  lat       double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    vv.id, vv.name, vv.category, vv.open_now, vv.lng, vv.lat
  FROM public.v_venues_ll vv
  WHERE vv.lng > west  AND vv.lat > south
    AND vv.lng < east  AND vv.lat < north
    AND (q IS NULL OR (vv.name ILIKE '%'||q||'%' OR vv.category ILIKE '%'||q||'%'))
  ORDER BY vv.open_now DESC NULLS LAST, vv.name
  LIMIT lim
$$;

-- Simple grid-based clustering for flow segments
CREATE OR REPLACE FUNCTION public.tg_flow_segments_set_h3()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  lng float8;
  lat float8;
BEGIN
  IF NEW.center IS NULL THEN
    NEW.h3_idx := NULL;
    RETURN NEW;
  END IF;

  -- Extract lng/lat from geometry; ensure SRID 4326
  IF ST_SRID(NEW.center) <> 4326 THEN
    NEW.center := ST_Transform(NEW.center, 4326);
  END IF;

  lng := ST_X(NEW.center);
  lat := ST_Y(NEW.center);

  -- Create a grid-based key for clustering (resolution ~0.001 degrees)
  NEW.h3_idx := 'grid_' || round(lng::numeric, 3) || '_' || round(lat::numeric, 3);

  RETURN NEW;
END;
$$;

-- Attach triggers on INSERT/UPDATE of center
DROP TRIGGER IF EXISTS trg_flow_segments_set_h3 ON public.flow_segments;

CREATE TRIGGER trg_flow_segments_set_h3
BEFORE INSERT OR UPDATE OF center
ON public.flow_segments
FOR EACH ROW
EXECUTE FUNCTION public.tg_flow_segments_set_h3();

-- Performance indexes
CREATE INDEX IF NOT EXISTS flow_segments_center_gist ON public.flow_segments USING GIST (center);
CREATE INDEX IF NOT EXISTS flow_segments_arrived_at ON public.flow_segments (arrived_at DESC);
CREATE INDEX IF NOT EXISTS flow_segments_h3_btree ON public.flow_segments (h3_idx);
CREATE INDEX IF NOT EXISTS venues_lng_lat_btree ON public.venues (lng, lat);

COMMIT;