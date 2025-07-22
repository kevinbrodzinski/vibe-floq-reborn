-- PR 1: Venues Data Ingestion & Schema (Fixed)
-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create venues table first
CREATE TABLE IF NOT EXISTS public.venues (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider    text NOT NULL,          -- 'google', 'yelp', etc
  provider_id text NOT NULL,          -- stable id from the provider
  name        text NOT NULL,
  slug        text GENERATED ALWAYS AS
              (lower(regexp_replace(name,'[^a-z0-9]+','-','g'))) STORED,
  lat         double precision NOT NULL,
  lng         double precision NOT NULL,
  address     text,
  categories  text[],
  rating      numeric,
  photo_url   text,
  updated_at  timestamptz DEFAULT now(),
  UNIQUE (provider, provider_id)
);

-- Add the computed geography column after table creation
ALTER TABLE public.venues 
ADD COLUMN IF NOT EXISTS geom geography(point,4326) 
GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(lng,lat),4326)) STORED;

-- Create spatial and performance indexes
CREATE INDEX IF NOT EXISTS venues_gix ON public.venues USING GIST (geom);
CREATE INDEX IF NOT EXISTS venues_slug_ix ON public.venues(slug);
CREATE INDEX IF NOT EXISTS venues_provider_ix ON public.venues(provider, provider_id);

-- Enable RLS with public read access
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "venues_public_read" ON public.venues
FOR SELECT 
USING (true);

-- Grant permissions for edge functions
GRANT ALL ON public.venues TO postgres, supabase_admin;