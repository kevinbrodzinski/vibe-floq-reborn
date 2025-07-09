-- Add venue_id column to vibes_now table with explicit default
ALTER TABLE public.vibes_now
ADD COLUMN IF NOT EXISTS venue_id uuid DEFAULT NULL
REFERENCES public.venues(id) ON DELETE SET NULL;

-- Create partial index for performance (only when venue_id is set)
CREATE INDEX IF NOT EXISTS idx_vibes_now_venue_id 
ON public.vibes_now(venue_id) 
WHERE venue_id IS NOT NULL;

-- Create optimized trigger function to auto-clear venue_id when user moves away
CREATE OR REPLACE FUNCTION public.clear_venue_id_on_distance()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only check if venue_id is set and geo actually changed
  IF NEW.venue_id IS NOT NULL AND (OLD.geo IS DISTINCT FROM NEW.geo) THEN
    -- Check if user is still within venue radius
    IF NOT EXISTS (
      SELECT 1 FROM public.venues v
      WHERE v.id = NEW.venue_id
      AND ST_DWithin(v.geo::geography, NEW.geo::geography, COALESCE(v.radius_m, 100))
    ) THEN
      NEW.venue_id := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger with WHEN clause for performance - fires on BOTH geo and venue_id changes
DROP TRIGGER IF EXISTS trigger_clear_venue_id_on_distance ON public.vibes_now;
CREATE TRIGGER trigger_clear_venue_id_on_distance
  BEFORE UPDATE OF geo, venue_id ON public.vibes_now
  FOR EACH ROW
  WHEN (OLD.geo IS DISTINCT FROM NEW.geo OR OLD.venue_id IS DISTINCT FROM NEW.venue_id)
  EXECUTE FUNCTION public.clear_venue_id_on_distance();

-- Create venues_near_me function with distance + live_count using ST_MakePoint
CREATE OR REPLACE FUNCTION public.venues_near_me(
  user_lat NUMERIC, 
  user_lng NUMERIC, 
  radius_km NUMERIC DEFAULT 0.5
)
RETURNS TABLE (
  id uuid,
  name text,
  lat numeric,
  lng numeric,
  vibe text,
  source text,
  distance_m numeric,
  live_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH user_point AS (
    SELECT ST_MakePoint(user_lng, user_lat)::geography AS location
  ),
  nearby_venues AS (
    SELECT 
      v.id,
      v.name,
      v.lat,
      v.lng,
      v.vibe,
      v.source,
      ST_Distance(up.location, v.geo::geography) AS distance_m
    FROM public.venues v
    CROSS JOIN user_point up
    WHERE ST_DWithin(up.location, v.geo::geography, radius_km * 1000)
  )
  SELECT 
    nv.id,
    nv.name,
    nv.lat,
    nv.lng,
    nv.vibe,
    nv.source,
    nv.distance_m,
    COALESCE(COUNT(vn.user_id) FILTER (WHERE vn.venue_id = nv.id), 0) AS live_count
  FROM nearby_venues nv
  LEFT JOIN public.vibes_now vn ON vn.venue_id = nv.id
    AND vn.expires_at > NOW()
    AND vn.visibility = 'public'
  GROUP BY nv.id, nv.name, nv.lat, nv.lng, nv.vibe, nv.source, nv.distance_m
  ORDER BY nv.distance_m;
$$;

-- Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.venues_near_me(NUMERIC, NUMERIC, NUMERIC) TO authenticated;