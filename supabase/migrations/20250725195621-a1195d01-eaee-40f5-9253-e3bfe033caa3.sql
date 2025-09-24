-- Create get_cluster_venues function for venue clustering
CREATE OR REPLACE FUNCTION public.get_cluster_venues(
  min_lng double precision,
  min_lat double precision, 
  max_lng double precision,
  max_lat double precision
)
RETURNS TABLE(
  id uuid,
  name text,
  category text,
  lat double precision,
  lng double precision,
  vibe_score integer,
  live_count integer,
  check_ins integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id,
    v.name,
    COALESCE(v.categories[1], 'general') as category,
    ST_Y(v.geom)::double precision as lat,
    ST_X(v.geom)::double precision as lng,
    COALESCE(v.vibe_score, 50)::integer as vibe_score,
    COALESCE(v.live_count, 0)::integer as live_count,
    COALESCE(v.popularity, 0)::integer as check_ins
  FROM venues v
  WHERE v.geom && ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)
    AND ST_Intersects(v.geom, ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326))
  ORDER BY COALESCE(v.live_count, 0) DESC, v.name ASC;
END;
$$;