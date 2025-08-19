-- Venues RLS and indexes for nearest venue lookup

SET search_path = public;

-- Enable RLS and create basic policy for venues
ALTER TABLE IF EXISTS public.venues ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read venues (adjust predicate as needed)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'venues' 
    AND policyname = 'venues_select_all'
  ) THEN
    CREATE POLICY venues_select_all
      ON public.venues FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END
$$;

-- Indexes for fast nearest-neighbor queries
-- If geometry column exists
CREATE INDEX IF NOT EXISTS venues_location_gix
  ON public.venues USING GIST (location);

-- If storing lat/lng as scalars, create an expression GIST index over geography point
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='venues' AND column_name='lat'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='venues' AND column_name='lng'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS venues_latlng_geog_gix
      ON public.venues
      USING GIST ((ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography))';
  END IF;
END
$$;