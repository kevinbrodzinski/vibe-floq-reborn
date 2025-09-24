/* ===============================================================
   Compound-cursor venue fetch  + supporting index
   =============================================================== */

-- ❶  Index that matches ORDER BY (DESC btree + id::text)
CREATE INDEX IF NOT EXISTS idx_venues_popularity_id_desc
    ON public.venues (popularity DESC, (id::text) DESC);

------------------------------------------------------------------
-- ❷  get_cluster_venues(min/max + cursor + limit)
------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_cluster_venues(
  min_lng          double precision,
  min_lat          double precision,
  max_lng          double precision,
  max_lat          double precision,
  cursor_popularity integer DEFAULT NULL,
  cursor_id         text    DEFAULT NULL,
  limit_rows        integer DEFAULT 10
)
RETURNS TABLE (
  id          text,
  name        text,
  category    text,
  lat         double precision,
  lng         double precision,
  vibe_score  numeric,
  live_count  integer,
  popularity  integer
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
    COALESCE(v.categories[1], 'venue')                  AS category,
    ST_Y(v.geom::geometry)                              AS lat,
    ST_X(v.geom::geometry)                              AS lng,
    COALESCE(v.vibe_score, 50.0)                        AS vibe_score,
    COALESCE(v.live_count, 0)                           AS live_count,
    COALESCE(v.popularity, 0)                           AS popularity
  FROM   public.venues v
  WHERE  v.geom && ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)
    AND  ST_Intersects(v.geom, ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326))
    /* compound cursor : (popularity,id) strictly smaller than previous page's tail */
    AND  (
           cursor_popularity IS NULL
           OR (v.popularity, v.id::text) < (cursor_popularity, cursor_id)
         )
  ORDER  BY v.popularity DESC, v.id DESC
  LIMIT  limit_rows;
END;
$$;

COMMENT ON FUNCTION public.get_cluster_venues IS
'Return up to limit_rows venues inside bbox, ordered by popularity DESC / id DESC.
Supports key-set pagination via (cursor_popularity, cursor_id).';

GRANT EXECUTE ON FUNCTION public.get_cluster_venues TO authenticated;