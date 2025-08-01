-- Fix get_nearby_venues function to return correct columns and handle radius properly
DROP FUNCTION IF EXISTS public.get_nearby_venues(double precision, double precision, integer, integer);

CREATE FUNCTION public.get_nearby_venues(
  p_lat double precision,
  p_lng double precision,
  p_radius_m integer DEFAULT 800,
  p_limit integer DEFAULT 25
)
RETURNS TABLE (
  id          uuid,
  name        text,
  lat         numeric,
  lng         numeric,
  distance_m  integer,
  categories  text[],
  live_count  integer
)
LANGUAGE sql
STABLE
AS $$
  WITH me AS (
    SELECT ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography AS g
  ), base AS (
    SELECT
      v.id,
      v.name,
      ST_Y(v.location::geometry) AS lat,
      ST_X(v.location::geometry) AS lng,
      round(ST_Distance(v.location, me.g))::int AS distance_m,
      COALESCE(v.categories, ARRAY['venue'::text]) AS categories,
      COALESCE(v.live_count, 0)::int AS live_count
    FROM public.venues v, me
    WHERE ST_DWithin(v.location, me.g, p_radius_m)
  )
  SELECT * FROM base
  ORDER BY distance_m
  LIMIT p_limit;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_nearby_venues(double precision, double precision, integer, integer) TO authenticated, anon;