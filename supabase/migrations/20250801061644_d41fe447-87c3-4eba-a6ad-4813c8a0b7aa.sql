/* ===================================================================
   20250804__restore_get_nearby_venues_fixed.sql
   • Drop broken overload (geom-based)
   • Recreate correct location-based function with correct types
=================================================================== */
BEGIN;

-- 1️⃣  Remove any existing versions to avoid ambiguity
DROP FUNCTION IF EXISTS public.get_nearby_venues(
  double precision,  -- p_lat
  double precision,  -- p_lng
  integer,           -- p_radius
  integer            -- p_limit
);

-- 2️⃣  Recreate the canonical version with correct return types
CREATE OR REPLACE FUNCTION public.get_nearby_venues(
  p_lat     double precision,
  p_lng     double precision,
  p_radius  integer DEFAULT 800,   -- metres
  p_limit   integer  DEFAULT 25
)
RETURNS TABLE (
  venue_id    uuid,
  name        text,
  distance_m  integer,  -- Changed from numeric to integer
  vibe_tag    text,
  people_now  integer   -- Changed from int to integer
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
      COALESCE(v.vibe, (v.categories)[1]) AS vibe_tag,
      ST_Distance(v.location, me.g)::integer AS distance_m,  -- Cast to integer
      COALESCE(v.live_count, 0)::integer     AS people_now   -- Cast to integer
    FROM public.venues v, me
    WHERE ST_DWithin(v.location, me.g, p_radius)
  )
  SELECT *
  FROM base
  ORDER BY distance_m
  LIMIT p_limit;
$function$;

-- 3️⃣  Permissions
GRANT EXECUTE ON FUNCTION public.get_nearby_venues(
  double precision,
  double precision,
  integer,
  integer
) TO authenticated, anon;

COMMIT;