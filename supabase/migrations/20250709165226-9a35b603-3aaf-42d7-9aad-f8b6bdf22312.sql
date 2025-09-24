
-- Fix trigger to avoid recursion and preserve venue clearing logic
CREATE OR REPLACE FUNCTION public.update_user_venue()
RETURNS TRIGGER
LANGUAGE plpgsql AS
$$
BEGIN
  -- Early return when venue_id is NULL - no work to do
  IF NEW.venue_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Just return NEW to avoid recursion
  -- The clear_venue_id_on_distance trigger handles clearing venue_id when user moves away
  RETURN NEW;
END;
$$;

-- Update the trigger to be more specific
DROP TRIGGER IF EXISTS trg_set_venue ON public.vibes_now;
CREATE TRIGGER trg_set_venue
  BEFORE UPDATE OF venue_id ON public.vibes_now
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_venue();

-- Optimized venues_near_me function with proper SRID handling and matching geometry types
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
  distance_m integer,
  live_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH user_loc AS (
    SELECT ST_Transform(
             ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326), 3857
           ) AS geom
  ),
  nearby AS (
    SELECT v.id, v.name, v.vibe, v.source,
           v.lat, v.lng,
           ST_Transform(v.geo, 3857) AS geom
    FROM   public.venues v
    WHERE  ST_DWithin(
             v.geo::geography,
             ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
             radius_km * 1000
           )
  )
  SELECT 
    n.id,
    n.name,
    n.lat,
    n.lng,
    n.vibe,
    n.source,
    ST_Distance(n.geom, u.geom)::integer AS distance_m,
    COALESCE(cnt.live_count, 0) AS live_count
  FROM nearby n
  JOIN user_loc u ON TRUE
  LEFT JOIN (
      SELECT venue_id, COUNT(*) AS live_count
      FROM public.vibes_now
      WHERE venue_id IS NOT NULL
        AND expires_at > NOW()
        AND visibility = 'public'
      GROUP BY venue_id
  ) cnt ON cnt.venue_id = n.id
  ORDER BY distance_m
  LIMIT 50;
$$;

-- Add optimized index with immutable predicate
DROP INDEX IF EXISTS idx_vibes_now_expires_venue;
CREATE INDEX IF NOT EXISTS idx_vibes_now_venue_id
  ON public.vibes_now (venue_id)
  WHERE venue_id IS NOT NULL;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.venues_near_me(NUMERIC, NUMERIC, NUMERIC) TO authenticated;
