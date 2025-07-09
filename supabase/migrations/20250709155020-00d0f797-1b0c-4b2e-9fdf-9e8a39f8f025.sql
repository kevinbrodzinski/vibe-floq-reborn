-- Enable PostGIS if you haven't already
CREATE EXTENSION IF NOT EXISTS postgis;

--------------------------------------------------------------------
-- Add description column to venues table
--------------------------------------------------------------------
ALTER TABLE public.venues 
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS radius_m integer DEFAULT 100;

--------------------------------------------------------------------
-- Ensure geography consistency and add spatial index
--------------------------------------------------------------------
-- Create spatial index on vibes_now.location for performance
CREATE INDEX IF NOT EXISTS idx_vibes_now_location_gist 
ON public.vibes_now USING GIST (location);

-- Create spatial index on venues.geo for performance  
CREATE INDEX IF NOT EXISTS idx_venues_geo_gist 
ON public.venues USING GIST (geo);

--------------------------------------------------------------------
-- Optimized RPC: venue_details with spatial join
--------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.venue_details(uuid);

CREATE OR REPLACE FUNCTION public.venue_details(v_id uuid)
RETURNS TABLE (
  id          uuid,
  name        text,
  vibe        text,
  description text,
  live_count  int,
  lat         numeric,
  lng         numeric
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT v.id,
         v.name,
         v.vibe,
         v.description,
         COALESCE(nearby.live_count, 0) AS live_count,
         v.lat,
         v.lng
  FROM   public.venues v
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS live_count
    FROM   public.vibes_now vn
    WHERE  vn.expires_at > NOW()
    AND    vn.visibility = 'public'
    AND    ST_DWithin(
             vn.location::geography,
             v.geo::geography, 
             COALESCE(v.radius_m, 100)
           )
  ) nearby ON true
  WHERE  v.id = v_id
  LIMIT  1;
$$;

-- Set function ownership to postgres for optimal performance
ALTER FUNCTION public.venue_details(uuid) OWNER TO postgres;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.venue_details TO authenticated;
GRANT EXECUTE ON FUNCTION public.venue_details TO anon;