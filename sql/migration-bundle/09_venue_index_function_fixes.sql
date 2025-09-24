-- Venue index and function optimizations
-- Applied fixes for pagination performance and cursor stability

-- SQL-1: Replace wide composite index with single-column index
DROP INDEX IF EXISTS idx_venues_popularity_id_desc;

-- New skinny index – cheapest for ORDER BY and still covers the query
CREATE INDEX IF NOT EXISTS idx_venues_popularity_desc
    ON public.venues (popularity DESC);

-- SQL-2: Replace function with improved null handling and single bbox filter
-- Drop only the version we mean to replace
DROP FUNCTION IF EXISTS
  public.get_cluster_venues(
      double precision, double precision,
      double precision, double precision,
      integer, text, integer
  );

-- Re-create with fixes
CREATE OR REPLACE FUNCTION public.get_cluster_venues(
  min_lng double precision,
  min_lat double precision,
  max_lng double precision,
  max_lat double precision,
  cursor_popularity integer DEFAULT NULL,
  cursor_id          text    DEFAULT NULL,
  limit_rows         integer DEFAULT 10
)
RETURNS TABLE(
  id         text,
  name       text,
  category   text,
  lat        numeric,
  lng        numeric,
  vibe_score numeric,
  live_count integer,
  popularity integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id::text,
    v.name,
    COALESCE(array_to_string(v.categories, ', '), 'venue')     AS category,
    ST_Y(v.geom::geometry)                                     AS lat,
    ST_X(v.geom::geometry)                                     AS lng,
    COALESCE(v.vibe_score, 50.0)                               AS vibe_score,
    COALESCE(v.live_count, 0)                                  AS live_count,
    COALESCE(v.popularity, 0)                                  AS popularity
  FROM public.venues v
  WHERE ST_Intersects(v.geom, ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326))
    AND (
          cursor_popularity IS NULL
          OR cursor_id IS NULL
          OR ( COALESCE(v.popularity,0), v.id )
             < ( cursor_popularity, cursor_id )
        )
  ORDER BY v.popularity DESC, v.id DESC
  LIMIT limit_rows;
END;
$$;

-- SQL-3: Schedule venue metrics refresh (pg_cron)
SELECT cron.schedule(
  'refresh_venue_metrics_daily',
  '15 2 * * *',
  $$SELECT public.refresh_venue_metrics();$$
);