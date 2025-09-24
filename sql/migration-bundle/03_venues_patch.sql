-- Add geohash column to venues for bucket filtering

ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS geohash5 text
  GENERATED ALWAYS AS (substr(ST_GeoHash(geom,5),1,5)) STORED;

CREATE INDEX IF NOT EXISTS idx_venues_geohash5 ON public.venues(geohash5);