-- Fix lat/lng precision in venues_sync_errors table
ALTER TABLE public.venues_sync_errors 
ALTER COLUMN lat TYPE double precision USING lat::double precision;

ALTER TABLE public.venues_sync_errors 
ALTER COLUMN lng TYPE double precision USING lng::double precision;