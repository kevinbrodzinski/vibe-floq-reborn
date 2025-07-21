-- 0. Purge or back-fill old null rows
DELETE FROM public.plan_transit_cache
WHERE from_geom IS NULL OR to_geom IS NULL;

-- 1. Add permissive constraints first (NOT yet NOT NULL)
ALTER TABLE public.plan_transit_cache
  ADD COLUMN IF NOT EXISTS from_geom geometry(Point,4326),
  ADD COLUMN IF NOT EXISTS to_geom   geometry(Point,4326);

-- 2. Back-fill any remaining nulls just in case (optional)
-- UPDATE public.plan_transit_cache SET ... ;

-- 3. Add POINT + SRID validity checks
ALTER TABLE public.plan_transit_cache
  ADD CONSTRAINT chk_from_geom_point
    CHECK ( GeometryType(from_geom) = 'POINT'
            AND NOT ST_IsEmpty(from_geom)
            AND ST_SRID(from_geom)=4326 ),
  ADD CONSTRAINT chk_to_geom_point
    CHECK ( GeometryType(to_geom) = 'POINT'
            AND NOT ST_IsEmpty(to_geom)
            AND ST_SRID(to_geom)=4326 );

-- 4. Finally enforce NOT NULL
ALTER TABLE public.plan_transit_cache
  ALTER COLUMN from_geom SET NOT NULL,
  ALTER COLUMN to_geom   SET NOT NULL;