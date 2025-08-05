-- Fix array access syntax in get_nearby_venues function
CREATE OR REPLACE FUNCTION public.get_nearby_venues(
  p_lat double precision,
  p_lng double precision,
  p_radius integer DEFAULT 800,
  p_limit integer DEFAULT 25
)
RETURNS TABLE (
  venue_id    uuid,
  name        text,
  distance_m  integer,
  vibe_tag    text,
  people_now  integer
)
LANGUAGE sql
STABLE
AS $$
  WITH me AS (
    SELECT ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography AS g
  ), base AS (
    SELECT
      v.id                                         AS venue_id,
      v.name,
      COALESCE(v.vibe, v.categories[1], 'unknown') AS vibe_tag,
      round(ST_Distance(v.location, me.g))::int    AS distance_m,
      COALESCE(v.live_count, 0)::int               AS people_now
    FROM public.venues v, me
    WHERE ST_DWithin(v.location, me.g, p_radius)
  )
  SELECT * FROM base
  ORDER BY distance_m
  LIMIT p_limit;
$$;