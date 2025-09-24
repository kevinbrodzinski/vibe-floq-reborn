-- Location pipeline: staging + main partitioned tables

/* ────────── raw_locations_staging (UNLOGGED) ────────── */
CREATE UNLOGGED TABLE IF NOT EXISTS public.raw_locations_staging (
  user_id     uuid,
  captured_at timestamptz,
  lat         double precision,
  lng         double precision,
  acc         int
);

/* ────────── raw_locations (partitioned) ────────── */
CREATE TABLE IF NOT EXISTS public.raw_locations (
  id          bigint GENERATED ALWAYS AS IDENTITY,
  user_id     uuid        NOT NULL,
  captured_at timestamptz NOT NULL,
  geom        geography(Point,4326),
  acc         int,
  geohash5    text GENERATED ALWAYS AS (substr(ST_GeoHash(geom,5),1,5)) STORED,
  p_month     text GENERATED ALWAYS AS (to_char(captured_at,'YYYYMM')) STORED,
  PRIMARY KEY (id, captured_at)
) PARTITION BY LIST(p_month);

/* helper to create a month + 1024 hash partitions */
CREATE OR REPLACE FUNCTION public.ensure_location_partition(_yyyymm text)
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE
  top text := format('raw_locations_%s', _yyyymm);
BEGIN
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS public.%I
       PARTITION OF public.raw_locations
       FOR VALUES IN (%L)
       PARTITION BY LIST (geohash5)', top, _yyyymm);

  -- each geohash5 value becomes its own sub-partition on-demand,
  -- but you can pre-create popular ones if desired
END$$;

/* base indexes (inherit by partitions) */
CREATE INDEX IF NOT EXISTS idx_raw_locations_geohash5 ON public.raw_locations(geohash5);
CREATE INDEX IF NOT EXISTS idx_raw_locations_geom ON public.raw_locations USING gist(geom);