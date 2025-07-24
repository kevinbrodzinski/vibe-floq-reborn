-- Optional: Data backfill for existing records
-- Run this once manually if you have legacy data

-- Recompute geohash5 for legacy raw_locations rows
UPDATE public.raw_locations
   SET geohash5 = substr(ST_GeoHash(geom,5),1,5)
 WHERE geohash5 IS NULL;

-- Recompute geohash5 for legacy venues rows  
UPDATE public.venues
   SET geohash5 = substr(ST_GeoHash(geom,5),1,5)
 WHERE geohash5 IS NULL;

-- Recompute day_key for legacy venue_visits rows
UPDATE public.venue_visits
   SET day_key = arrived_at::date
 WHERE day_key IS NULL;