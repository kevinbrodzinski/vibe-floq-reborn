-- Drop and recreate the optimized get_cluster_venues function
DROP FUNCTION IF EXISTS public.get_cluster_venues(double precision, double precision, double precision, double precision);

CREATE OR REPLACE FUNCTION public.get_cluster_venues(
  min_lng        double precision,
  min_lat        double precision,
  max_lng        double precision,
  max_lat        double precision,
  cursor_popularity integer DEFAULT 0,   -- renamed for clarity
  limit_rows        integer DEFAULT 10
)
RETURNS TABLE (
  id          uuid,
  name        text,
  category    text,
  lat         double precision,
  lng         double precision,
  vibe_score  numeric(5,2),
  live_count  integer,
  check_ins   integer          -- popularity in the code-base
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  /* clamp limit_rows to sane bounds (1‥100) */
  WITH lim AS (
    SELECT GREATEST(1, LEAST(limit_rows, 100)) AS rows_wanted
  )
  SELECT v.id,
         v.name,
         COALESCE(v.categories[1], 'general')                  AS category,
         ST_Y(v.geom)::double precision                        AS lat,
         ST_X(v.geom)::double precision                        AS lng,
         COALESCE(v.vibe_score, 50.0)::numeric(5,2)            AS vibe_score,
         COALESCE(v.live_count, 0)                             AS live_count,
         COALESCE(v.popularity, 0)                             AS check_ins
  FROM   public.venues v, lim
  WHERE  v.geom && ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)
    AND  ST_Intersects(v.geom, ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326))
    AND  v.popularity IS NOT NULL
    AND  v.popularity > cursor_popularity
  ORDER  BY v.popularity DESC, v.name ASC
  LIMIT  (SELECT rows_wanted FROM lim);
$$;

-- Set ownership and permissions
ALTER FUNCTION public.get_cluster_venues
  OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.get_cluster_venues TO authenticated;