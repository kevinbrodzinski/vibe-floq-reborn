-- Fix get_nearby_venues function with correct types
BEGIN;

-- Drop all existing versions
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT pg_get_function_identity_arguments(p.oid) AS args
    FROM   pg_proc p
    JOIN   pg_namespace n ON n.oid = p.pronamespace
    WHERE  n.nspname = 'public'
      AND  p.proname = 'get_nearby_venues'
  LOOP
    EXECUTE format(
      'DROP FUNCTION IF EXISTS public.get_nearby_venues(%s);',
      r.args
    );
  END LOOP;
END $$;

-- Recreate with exact column types from venues table
CREATE OR REPLACE FUNCTION public.get_nearby_venues(
  p_lat     double precision,
  p_lng     double precision,
  p_radius  integer DEFAULT 800,
  p_limit   integer DEFAULT 25
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
AS $function$
  WITH me AS (
    SELECT ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography AS g
  ), base AS (
    SELECT
      v.id           AS venue_id,
      v.name,
      COALESCE(v.vibe, (v.categories->>0), 'unknown') AS vibe_tag,
      round(ST_Distance(v.location, me.g))::integer AS distance_m,
      COALESCE(v.live_count, 0)::integer AS people_now
    FROM public.venues v, me
    WHERE ST_DWithin(v.location, me.g, p_radius)
  )
  SELECT venue_id, name, distance_m, vibe_tag, people_now
  FROM base
  ORDER BY distance_m
  LIMIT p_limit;
$function$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_nearby_venues(double precision, double precision, integer, integer) TO authenticated, anon;

COMMIT;