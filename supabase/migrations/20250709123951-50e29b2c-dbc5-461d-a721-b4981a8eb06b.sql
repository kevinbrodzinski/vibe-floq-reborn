-- Phase 3A · Venue clustering + dynamic floq radius
-- Migration: 20250710_geo_layer.sql

-------------------------------------------------------------------------------
-- SAFETY PREAMBLE
-------------------------------------------------------------------------------
-- Ensure PostGIS is available (idempotent)
CREATE EXTENSION IF NOT EXISTS postgis;

-------------------------------------------------------------------------------
-- 1. VENUES TABLE
-------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.venues (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT         NOT NULL,
  lat  NUMERIC(9,6) NOT NULL,
  lng  NUMERIC(9,6) NOT NULL,
  vibe TEXT,
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT now(),
  geo GEOGRAPHY(POINT,4326) GENERATED ALWAYS AS (
        ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
      ) STORED
);

CREATE INDEX IF NOT EXISTS idx_venues_geo
  ON public.venues USING GIST (geo);

-- RLS: public read
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "venues_public_read"
  ON public.venues FOR SELECT USING (true);

-------------------------------------------------------------------------------
-- 2. FLOQS.radius_m COLUMN
-------------------------------------------------------------------------------
ALTER TABLE public.floqs
  ADD COLUMN IF NOT EXISTS radius_m INTEGER DEFAULT 100
  CHECK (radius_m > 0);

-------------------------------------------------------------------------------
-- 3. AUTO-EXPAND RADIUS TRIGGER
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_floq_radius()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Skip if bbox-unrelated operation
  IF TG_OP = 'INSERT' OR TG_OP = 'DELETE' THEN
    UPDATE public.floqs
    SET radius_m = 100
                   + 15 * GREATEST(
                       (SELECT COUNT(*) FROM public.floq_participants
                        WHERE floq_id = COALESCE(NEW.floq_id, OLD.floq_id)) - 1,
                       0
                     ),
        updated_at = now()
    WHERE id = COALESCE(NEW.floq_id, OLD.floq_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Make sure Postgres owns the function to keep DEFERRER security valid
ALTER FUNCTION public.update_floq_radius() OWNER TO postgres;

DROP TRIGGER IF EXISTS trg_fp_radius ON public.floq_participants;
CREATE TRIGGER trg_fp_radius
  AFTER INSERT OR DELETE ON public.floq_participants
  FOR EACH ROW EXECUTE FUNCTION public.update_floq_radius();

-------------------------------------------------------------------------------
-- 4. RPC: GET VENUES IN BBOX  (bounded + 500-row cap)
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_venues_in_bbox(
  west  NUMERIC,
  south NUMERIC,
  east  NUMERIC,
  north NUMERIC
)
RETURNS TABLE (
  id   UUID,
  name TEXT,
  lat  NUMERIC,
  lng  NUMERIC,
  vibe TEXT,
  source TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  -- guard against invalid / world-wide calls
  IF west >= east OR south >= north THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT v.id, v.name, v.lat, v.lng, v.vibe, v.source
  FROM public.venues v
  WHERE ST_Within(
          v.geo::geometry,
          ST_MakeEnvelope(west, south, east, north, 4326)
        )
  LIMIT 500;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_venues_in_bbox TO anon, authenticated;

-------------------------------------------------------------------------------
-- 5. ADD VENUES TO SUPABASE REALTIME PUBLICATION (idempotent)
-------------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'venues'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.venues;
  END IF;
END;
$$;

-------------------------------------------------------------------------------
-- 6. SEED INITIAL LA VENUES  (explicit IDs so re-runs are idempotent)
-------------------------------------------------------------------------------
INSERT INTO public.venues (id, name, lat, lng, vibe, source) VALUES
  ('11111111-1111-1111-1111-111111111111', 'The Griffin',                34.090000, -118.291000, 'chill',     'seed'),
  ('22222222-2222-2222-2222-222222222222', 'Griffith Observatory',       34.118400, -118.300400, 'scenic',    'seed'),
  ('33333333-3333-3333-3333-333333333333', 'Walt Disney Concert Hall',   34.055600, -118.249200, 'cultural',  'seed'),
  ('44444444-4444-4444-4444-444444444444', 'Santa Monica Pier',          34.008800, -118.498000, 'fun',       'seed'),
  ('55555555-5555-5555-5555-555555555555', 'Venice Beach Boardwalk',     33.985100, -118.469200, 'vibrant',   'seed'),
  ('66666666-6666-6666-6666-666666666666', 'The Last Bookstore',         34.050000, -118.251000, 'cozy',      'seed'),
  ('77777777-7777-7777-7777-777777777777', 'Grand Central Market',       34.051000, -118.249000, 'bustling',  'seed'),
  ('88888888-8888-8888-8888-888888888888', 'Hollywood Bowl',             34.112200, -118.339000, 'musical',   'seed'),
  ('99999999-9999-9999-9999-999999999999', 'The Getty Center',           34.078000, -118.474000, 'artistic',  'seed'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Runyon Canyon Park',         34.110000, -118.351000, 'active',    'seed'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Melrose Trading Post',       34.083900, -118.361000, 'vintage',   'seed'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'The Broad Museum',           34.054000, -118.250000, 'modern',    'seed'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'La Brea Tar Pits',           34.063800, -118.356000, 'historic',  'seed'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'The Standard Rooftop',       34.051600, -118.254000, 'trendy',    'seed'),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'Angels Flight Railway',      34.051500, -118.249500, 'nostalgic', 'seed'),
  ('10101010-1010-1010-1010-101010101010', 'Dodger Stadium',             34.073851, -118.240000, 'sporty',    'seed'),
  ('20202020-2020-2020-2020-202020202020', 'Exposition Park',            34.016000, -118.287000, 'family',    'seed'),
  ('30303030-3030-3030-3030-303030303030', 'Manhattan Beach Pier',       33.885000, -118.410000, 'beachy',    'seed'),
  ('40404040-4040-4040-4040-404040404040', 'Rodeo Drive',                34.067000, -118.400000, 'luxury',    'seed'),
  ('50505050-5050-5050-5050-505050505050', 'Sunset Strip',               34.090500, -118.385000, 'nightlife', 'seed')
ON CONFLICT DO NOTHING;  -- Safe to re-run