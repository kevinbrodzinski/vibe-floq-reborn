
-- Add venue_id column to vibes_now table with explicit default
ALTER TABLE public.vibes_now
ADD COLUMN IF NOT EXISTS venue_id uuid DEFAULT NULL
REFERENCES public.venues(id) ON DELETE SET NULL;

-- Create index for fast venue filtering
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

-- Create trigger with WHEN clause for performance
DROP TRIGGER IF EXISTS trigger_clear_venue_id_on_distance ON public.vibes_now;
CREATE TRIGGER trigger_clear_venue_id_on_distance
  BEFORE UPDATE ON public.vibes_now
  FOR EACH ROW
  WHEN (OLD.geo IS DISTINCT FROM NEW.geo OR OLD.venue_id IS DISTINCT FROM NEW.venue_id)
  EXECUTE FUNCTION public.clear_venue_id_on_distance();

-- Update venue_details function for O(1) venue filtering with null safety
CREATE OR REPLACE FUNCTION public.venue_details(v_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  vibe text,
  description text,
  live_count bigint,
  lat numeric,
  lng numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    v.id,
    v.name,
    v.vibe,
    COALESCE(v.description, '') as description,
    COALESCE(COUNT(vn.user_id) FILTER (WHERE vn.venue_id = v.id), 0) as live_count,
    v.lat,
    v.lng
  FROM public.venues v
  LEFT JOIN public.vibes_now vn ON vn.venue_id = v.id
    AND vn.expires_at > NOW()
    AND vn.visibility = 'public'
  WHERE v.id = v_id
  GROUP BY v.id, v.name, v.vibe, v.description, v.lat, v.lng
  LIMIT 1;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.venue_details(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.venue_details(uuid) TO anon;
