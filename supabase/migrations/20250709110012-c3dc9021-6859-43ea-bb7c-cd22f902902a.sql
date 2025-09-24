-- Fix RLS recursion and add proper spatial schema for Phase 2

-- 1. Create security definer function to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.get_user_location()
RETURNS GEOMETRY AS $$
  SELECT location FROM public.vibes_now WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- 2. Drop and recreate RLS policies to fix recursion
DROP POLICY IF EXISTS "Presence: read within range" ON public.vibes_now;
CREATE POLICY "Presence: read within range" ON public.vibes_now 
FOR SELECT USING (
  visibility = 'public' OR 
  user_id = auth.uid() OR
  ST_DWithin(location, public.get_user_location(), broadcast_radius)
);

-- 3. Add geography columns for better performance
ALTER TABLE public.vibes_now ADD COLUMN IF NOT EXISTS geo GEOGRAPHY(POINT, 4326);
ALTER TABLE public.floqs ADD COLUMN IF NOT EXISTS geo GEOGRAPHY(POINT, 4326);

-- 4. Update geography columns from existing geometry
UPDATE public.vibes_now SET geo = ST_Transform(location, 4326)::geography WHERE geo IS NULL;
UPDATE public.floqs SET geo = ST_Transform(location, 4326)::geography WHERE geo IS NULL;

-- 5. Create spatial indexes for performance
CREATE INDEX IF NOT EXISTS idx_vibes_now_geo ON public.vibes_now USING GIST (geo);
CREATE INDEX IF NOT EXISTS idx_floqs_geo ON public.floqs USING GIST (geo);

-- 6. Create presence_nearby helper function
CREATE OR REPLACE FUNCTION public.presence_nearby(lat NUMERIC, lng NUMERIC, km NUMERIC)
RETURNS SETOF public.vibes_now AS $$
  SELECT * FROM public.vibes_now
  WHERE ST_DWithin(geo, ST_MakePoint(lng, lat)::geography, km * 1000)
  AND expires_at > NOW()
  AND user_id != auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- 7. Create walkable_floqs helper function  
CREATE OR REPLACE FUNCTION public.walkable_floqs(lat NUMERIC, lng NUMERIC, max_walk_meters NUMERIC)
RETURNS TABLE (
  id UUID,
  title TEXT,
  primary_vibe public.vibe_enum,
  participant_count BIGINT,
  distance_meters INTEGER,
  starts_at TIMESTAMPTZ
) AS $$
  SELECT 
    f.id,
    f.title,
    f.primary_vibe,
    COUNT(fp.user_id) as participant_count,
    ST_Distance(f.geo, ST_MakePoint(lng, lat)::geography)::integer as distance_meters,
    f.starts_at
  FROM public.floqs f
  LEFT JOIN public.floq_participants fp ON f.id = fp.floq_id
  WHERE f.ends_at > NOW()
    AND f.visibility = 'public'
    AND ST_DWithin(f.geo, ST_MakePoint(lng, lat)::geography, max_walk_meters)
  GROUP BY f.id, f.title, f.primary_vibe, f.starts_at, f.geo
  ORDER BY distance_meters;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- 8. Add trigger to update geography when geometry changes
CREATE OR REPLACE FUNCTION public.update_geography_from_geometry()
RETURNS TRIGGER AS $$
BEGIN
  NEW.geo = ST_Transform(NEW.location, 4326)::geography;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_vibes_now_geo ON public.vibes_now;
CREATE TRIGGER update_vibes_now_geo
  BEFORE INSERT OR UPDATE ON public.vibes_now
  FOR EACH ROW
  EXECUTE FUNCTION public.update_geography_from_geometry();

DROP TRIGGER IF EXISTS update_floqs_geo ON public.floqs;
CREATE TRIGGER update_floqs_geo
  BEFORE INSERT OR UPDATE ON public.floqs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_geography_from_geometry();