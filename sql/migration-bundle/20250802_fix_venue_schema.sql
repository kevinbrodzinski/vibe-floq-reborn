-- Fix venue schema to ensure all required fields exist
-- Migration: 20250802_fix_venue_schema.sql

-- Step 1: Add missing columns if they don't exist
DO $$
BEGIN
  -- Add vibe column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'venues' AND column_name = 'vibe'
  ) THEN
    ALTER TABLE public.venues ADD COLUMN vibe TEXT DEFAULT 'mixed';
  END IF;

  -- Add description column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'venues' AND column_name = 'description'
  ) THEN
    ALTER TABLE public.venues ADD COLUMN description TEXT;
  END IF;

  -- Add external_id column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'venues' AND column_name = 'external_id'
  ) THEN
    ALTER TABLE public.venues ADD COLUMN external_id TEXT;
  END IF;

  -- Add geom column if missing (geometry for compatibility with existing functions)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'venues' AND column_name = 'geom'
  ) THEN
    ALTER TABLE public.venues ADD COLUMN geom geometry(Point,4326);
  END IF;

  -- Add geohash5 column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'venues' AND column_name = 'geohash5'
  ) THEN
    ALTER TABLE public.venues ADD COLUMN geohash5 TEXT;
  END IF;

  -- Add source column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'venues' AND column_name = 'source'
  ) THEN
    ALTER TABLE public.venues ADD COLUMN source TEXT DEFAULT 'manual';
  END IF;

  -- Add price_tier column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'venues' AND column_name = 'price_tier'
  ) THEN
    ALTER TABLE public.venues ADD COLUMN price_tier TEXT DEFAULT '$';
  END IF;

  -- Add live_count column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'venues' AND column_name = 'live_count'
  ) THEN
    ALTER TABLE public.venues ADD COLUMN live_count INTEGER DEFAULT 0;
  END IF;

  -- Add popularity column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'venues' AND column_name = 'popularity'
  ) THEN
    ALTER TABLE public.venues ADD COLUMN popularity INTEGER DEFAULT 0;
  END IF;

  -- Add vibe_score column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'venues' AND column_name = 'vibe_score'
  ) THEN
    ALTER TABLE public.venues ADD COLUMN vibe_score NUMERIC DEFAULT 50.0;
  END IF;
END $$;

-- Step 2: Populate external_id from provider_id for existing records
UPDATE public.venues
SET external_id = provider_id
WHERE external_id IS NULL AND provider_id IS NOT NULL;

-- Step 3: Populate source from provider for existing records (handle NULL sources)
UPDATE public.venues
SET source = provider
WHERE (source IS NULL OR source = 'manual') AND provider IS NOT NULL;

-- Step 4: Populate geom from lat/lng for existing records (with coordinate validation)
UPDATE public.venues
SET geom = ST_SetSRID(ST_MakePoint(lng, lat), 4326)
WHERE geom IS NULL 
  AND lat IS NOT NULL 
  AND lng IS NOT NULL 
  AND lat BETWEEN -90 AND 90 
  AND lng BETWEEN -180 AND 180
  AND lat != 0 
  AND lng != 0;

-- Step 5: Drop old unique constraint safely and add new one
ALTER TABLE public.venues DROP CONSTRAINT IF EXISTS venues_provider_provider_id_key;
ALTER TABLE public.venues DROP CONSTRAINT IF EXISTS venues_provider_provider_id_unique;

-- Step 6: Add new unique constraint on (source, external_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'venues_source_external_id_key'
  ) THEN
    ALTER TABLE public.venues ADD CONSTRAINT venues_source_external_id_key UNIQUE (source, external_id);
  END IF;
END $$;

-- Step 7: Create performance indexes
CREATE INDEX IF NOT EXISTS idx_venues_vibe ON public.venues(vibe);
CREATE INDEX IF NOT EXISTS idx_venues_source ON public.venues(source);
CREATE INDEX IF NOT EXISTS idx_venues_external_id ON public.venues(external_id);
CREATE INDEX IF NOT EXISTS idx_venues_geom_gist ON public.venues USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_venues_live_count ON public.venues(live_count);
CREATE INDEX IF NOT EXISTS idx_venues_popularity ON public.venues(popularity);
CREATE INDEX IF NOT EXISTS idx_venues_vibe_score ON public.venues(vibe_score);

-- Step 8: Create composite index for vibe + location queries
CREATE INDEX IF NOT EXISTS idx_venues_vibe_geom_gist ON public.venues USING GIST(geom, vibe);

-- Step 9: Update RPC functions to use new fields
CREATE OR REPLACE FUNCTION public.get_cluster_venues(
  min_lng double precision, 
  min_lat double precision, 
  max_lng double precision, 
  max_lat double precision, 
  cursor_popularity integer DEFAULT NULL::integer, 
  cursor_id text DEFAULT NULL::text, 
  limit_rows integer DEFAULT 10
)
RETURNS TABLE(
  id text, 
  name text, 
  category text, 
  lat numeric, 
  lng numeric, 
  vibe_score numeric, 
  live_count integer, 
  popularity integer,
  vibe text,
  source text,
  external_id text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    v.id::text,
    v.name,
    COALESCE(array_to_string(v.categories, ', '), 'venue') AS category,
    ST_Y(v.geom::geometry) AS lat,
    ST_X(v.geom::geometry) AS lng,
    COALESCE(v.vibe_score, 50.0) AS vibe_score,
    COALESCE(v.live_count, 0) AS live_count,
    COALESCE(v.popularity, 0) AS popularity,
    COALESCE(v.vibe, 'mixed') AS vibe,
    COALESCE(v.source, 'manual') AS source,
    COALESCE(v.external_id, v.id::text) AS external_id
  FROM public.venues v
  WHERE ST_Intersects(v.geom, ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326))
    AND (
          cursor_popularity IS NULL
          OR cursor_id IS NULL
          OR ( COALESCE(v.popularity,0), v.id )
             < ( cursor_popularity, cursor_id )
        )
  ORDER BY v.popularity DESC, v.id DESC
  LIMIT limit_rows;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_venues_in_bbox(
  west double precision,
  south double precision, 
  east double precision,
  north double precision
)
RETURNS TABLE(
  id text,
  name text,
  lat numeric,
  lng numeric,
  vibe text,
  source text,
  external_id text,
  categories text[],
  rating numeric,
  photo_url text,
  address text,
  live_count integer,
  popularity integer,
  vibe_score numeric,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    v.id::text,
    v.name,
    ST_Y(v.geom::geometry) AS lat,
    ST_X(v.geom::geometry) AS lng,
    COALESCE(v.vibe, 'mixed') AS vibe,
    COALESCE(v.source, 'manual') AS source,
    COALESCE(v.external_id, v.id::text) AS external_id,
    COALESCE(v.categories, ARRAY[]::text[]) AS categories,
    v.rating,
    v.photo_url,
    v.address,
    COALESCE(v.live_count, 0) AS live_count,
    COALESCE(v.popularity, 0) AS popularity,
    COALESCE(v.vibe_score, 50.0) AS vibe_score,
    v.created_at,
    v.updated_at
  FROM public.venues v
  WHERE ST_Intersects(v.geom, ST_MakeEnvelope(west, south, east, north, 4326))
  ORDER BY v.popularity DESC, v.id;
END;
$function$;

-- Step 10: Ensure RLS policy exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'venues' AND policyname = 'venues_public_read'
  ) THEN
    CREATE POLICY venues_public_read ON public.venues
    FOR SELECT USING (true);
  END IF;
END $$;

-- Step 11: Update table statistics for query planning
ANALYZE public.venues;