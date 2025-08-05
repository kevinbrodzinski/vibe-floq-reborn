
-- Phase 2 Completion: Fix Spatial Query Results

-- 1. Fix presence_nearby function to optionally include current user
CREATE OR REPLACE FUNCTION public.presence_nearby(lat NUMERIC, lng NUMERIC, km NUMERIC, include_self BOOLEAN DEFAULT true)
RETURNS SETOF public.vibes_now AS $$
  SELECT * FROM public.vibes_now
  WHERE ST_DWithin(geo, ST_MakePoint(lng, lat)::geography, km * 1000)
  AND expires_at > NOW()
  AND (include_self OR user_id != auth.uid());
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- 2. Add generated geo columns for automatic spatial indexing
-- Drop existing geo columns and triggers
ALTER TABLE public.vibes_now DROP COLUMN IF EXISTS geo;
ALTER TABLE public.floqs DROP COLUMN IF EXISTS geo;

-- Add generated geo column for vibes_now (auto-computed from lat/lng in location)
ALTER TABLE public.vibes_now 
ADD COLUMN geo GEOGRAPHY(POINT, 4326) 
GENERATED ALWAYS AS (
  ST_Transform(location, 4326)::geography
) STORED;

-- Add generated geo column for floqs
ALTER TABLE public.floqs 
ADD COLUMN geo GEOGRAPHY(POINT, 4326) 
GENERATED ALWAYS AS (
  ST_Transform(location, 4326)::geography
) STORED;

-- Create spatial indexes for better performance
CREATE INDEX IF NOT EXISTS idx_vibes_now_geo ON public.vibes_now USING GIST (geo);
CREATE INDEX IF NOT EXISTS idx_floqs_geo ON public.floqs USING GIST (geo);

-- 3. Add test floqs around LA area for testing
INSERT INTO public.floqs (title, primary_vibe, location, starts_at, ends_at, visibility)
VALUES 
  ('Venice Beach Vibes', 'social', ST_SetSRID(ST_MakePoint(-118.4691, 33.9850), 4326), NOW(), NOW() + INTERVAL '4 hours', 'public'),
  ('Santa Monica Sunset', 'chill', ST_SetSRID(ST_MakePoint(-118.4912, 34.0195), 4326), NOW(), NOW() + INTERVAL '2 hours', 'public'),
  ('Beverly Hills Flow', 'flowing', ST_SetSRID(ST_MakePoint(-118.4001, 34.0736), 4326), NOW(), NOW() + INTERVAL '3 hours', 'public');

-- 4. Remove the manual geography update trigger since we now use generated columns
DROP TRIGGER IF EXISTS update_vibes_now_geo ON public.vibes_now;
DROP TRIGGER IF EXISTS update_floqs_geo ON public.floqs;
DROP FUNCTION IF EXISTS public.update_geography_from_geometry();
