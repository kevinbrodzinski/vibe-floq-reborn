-- Fix geometry constraints and handle existing data
-- Safe back-fill BEFORE setting NOT NULL
UPDATE public.plan_transit_cache
SET from_geom = ST_SetSRID(ST_MakePoint(0,0),4326),
    to_geom = ST_SetSRID(ST_MakePoint(0,0),4326)
WHERE from_geom IS NULL OR to_geom IS NULL;

-- Now safely set NOT NULL constraints
ALTER TABLE public.plan_transit_cache
  ALTER COLUMN from_geom SET NOT NULL,
  ALTER COLUMN to_geom SET NOT NULL;

-- Update geometry constraints to be more flexible (allow Z/M coordinates)
ALTER TABLE public.plan_transit_cache
  DROP CONSTRAINT IF EXISTS check_valid_from_geom,
  DROP CONSTRAINT IF EXISTS check_valid_to_geom;

ALTER TABLE public.plan_transit_cache
  ADD CONSTRAINT check_valid_from_geom
    CHECK (ST_GeometryType(from_geom) LIKE 'ST_Point%'),
  ADD CONSTRAINT check_valid_to_geom
    CHECK (ST_GeometryType(to_geom) LIKE 'ST_Point%');