-- Nearest Venue RPC for Wave → Venue lookup
-- Requires PostGIS. Ensure your project has the postgis extension enabled.

SET search_path = public;

-- Core RPC: returns nearest venue within max distance (meters). Works with either
-- a PostGIS geometry column `location` OR scalar `lat`/`lng` columns.
CREATE OR REPLACE FUNCTION public.rpc_nearest_venue(
  in_lat double precision,
  in_lng double precision,
  in_max_distance_m integer DEFAULT 200
)
RETURNS TABLE (
  venue_id uuid,
  name text,
  distance_m integer,
  lat double precision,
  lng double precision
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_geom boolean;
  has_lat boolean;
  has_lng boolean;
  pt_geog geography := ST_SetSRID(ST_MakePoint(in_lng, in_lat), 4326)::geography;
BEGIN
  IF in_lat IS NULL OR in_lng IS NULL THEN
    RETURN; -- no rows
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='venues' AND column_name='location'
  ) INTO has_geom;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='venues' AND column_name='lat'
  ) INTO has_lat;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='venues' AND column_name='lng'
  ) INTO has_lng;

  IF has_geom THEN
    RETURN QUERY
    SELECT v.id AS venue_id,
           v.name,
           ROUND(
             ST_DistanceSphere(
               CASE WHEN ST_SRID(v.location) = 4326 THEN v.location ELSE ST_Transform(v.location, 4326) END,
               ST_SetSRID(ST_MakePoint(in_lng, in_lat), 4326)
             )::numeric
           )::int AS distance_m,
           ST_Y(CASE WHEN ST_SRID(v.location)=4326 THEN v.location ELSE ST_Transform(v.location,4326) END)::double precision AS lat,
           ST_X(CASE WHEN ST_SRID(v.location)=4326 THEN v.location ELSE ST_Transform(v.location,4326) END)::double precision AS lng
    FROM public.venues v
    WHERE ST_DWithin(
            (CASE WHEN ST_SRID(v.location)=4326 THEN v.location ELSE ST_Transform(v.location,4326) END)::geography,
            pt_geog,
            in_max_distance_m
          )
    ORDER BY ST_DistanceSphere(
              CASE WHEN ST_SRID(v.location)=4326 THEN v.location ELSE ST_Transform(v.location,4326) END,
              ST_SetSRID(ST_MakePoint(in_lng, in_lat), 4326)
            )
    LIMIT 1;
  ELSIF has_lat AND has_lng THEN
    RETURN QUERY
    SELECT v.id AS venue_id,
           v.name,
           ROUND(
             ST_DistanceSphere(
               ST_SetSRID(ST_MakePoint(v.lng, v.lat), 4326),
               ST_SetSRID(ST_MakePoint(in_lng, in_lat), 4326)
             )::numeric
           )::int AS distance_m,
           v.lat::double precision,
           v.lng::double precision
    FROM public.venues v
    WHERE ST_DWithin(
            ST_SetSRID(ST_MakePoint(v.lng, v.lat), 4326)::geography,
            pt_geog,
            in_max_distance_m
          )
    ORDER BY ST_DistanceSphere(
              ST_SetSRID(ST_MakePoint(v.lng, v.lat), 4326),
              ST_SetSRID(ST_MakePoint(in_lng, in_lat), 4326)
            )
    LIMIT 1;
  ELSE
    RETURN; -- no rows if we can't locate venues
  END IF;
END
$$;

-- Permissions
REVOKE ALL ON FUNCTION public.rpc_nearest_venue(double precision,double precision,integer) FROM public;
GRANT EXECUTE ON FUNCTION public.rpc_nearest_venue(double precision,double precision,integer) TO authenticated;