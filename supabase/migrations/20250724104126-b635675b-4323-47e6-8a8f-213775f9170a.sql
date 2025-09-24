-- Add geohash5 stored column to raw_locations for fast venue matching
-- This is Option A: recommended for high-volume location data

-- 1. Add geohash5 stored column to parent table
ALTER TABLE public.raw_locations
  ADD COLUMN IF NOT EXISTS geohash5 TEXT
  GENERATED ALWAYS AS (substr(ST_GeoHash(geom, 5), 1, 5)) STORED;

-- 2. Create index for fast equality joins with venues
CREATE INDEX IF NOT EXISTS idx_raw_locations_geohash5
  ON public.raw_locations (geohash5);

-- 3. Update the partition helper to include geohash5 index on new partitions
CREATE OR REPLACE FUNCTION public.ensure_location_partition(_yyyymm TEXT) 
RETURNS VOID
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE 
  t TEXT := format('raw_locations_%s', _yyyymm);
BEGIN
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.raw_locations
       FOR VALUES IN (%L) PARTITION BY LIST (p_hash)', t, _yyyymm);
  FOR i IN 0..1023 LOOP
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS public.%I_%s PARTITION OF public.%I
         FOR VALUES IN (%s)', t, lpad(i::text,4,'0'), t, i);
    -- Add geohash5 index to each partition
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS idx_%I_%s_geohash5 ON public.%I_%s (geohash5)', 
      t, lpad(i::text,4,'0'), t, lpad(i::text,4,'0'));
  END LOOP;
END $$;

-- 4. Now the match_unmatched_pings() function will work correctly
-- (no changes needed - it already uses rl.geohash5 = v.geohash5)