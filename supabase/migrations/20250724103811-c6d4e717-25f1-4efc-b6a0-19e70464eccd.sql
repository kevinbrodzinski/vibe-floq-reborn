-- ════════════════════════════════════════════════════════════════
-- Complete Location Pipeline Database Schema (Fixed)
-- ════════════════════════════════════════════════════════════════

-- 1. Venues catalogue
CREATE TABLE IF NOT EXISTS public.venues (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT,              -- google place_id, foursquare fsq_id
  provider_id SMALLINT,          -- refs integrations.provider
  name      TEXT NOT NULL,
  radius_m  INT  NOT NULL DEFAULT 50,
  geom      GEOGRAPHY(POINT,4326) NOT NULL,
  geohash5  TEXT GENERATED ALWAYS AS (substr(ST_GeoHash(geom,5),1,5)) STORED,
  category  TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_venues_geom ON public.venues USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_venues_geohash5 ON public.venues(geohash5);

-- 2. Raw-ping staging table (fast UNLOGGED for edge function writes)
CREATE UNLOGGED TABLE IF NOT EXISTS public.raw_locations_staging (
  user_id UUID, 
  captured_at TIMESTAMPTZ, 
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION, 
  acc INT
);

-- 3. Partitioned main table (nightly sweep moves rows here)
CREATE TABLE IF NOT EXISTS public.raw_locations (
  id  BIGINT GENERATED ALWAYS AS IDENTITY,
  user_id UUID NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL,
  geom GEOGRAPHY(POINT,4326),
  acc INT,
  p_month TEXT GENERATED ALWAYS AS (to_char(captured_at,'YYYYMM')) STORED,
  p_hash  INT  GENERATED ALWAYS AS ((hashtext(user_id::text)&1023)) STORED,
  PRIMARY KEY (id,captured_at)
) PARTITION BY LIST (p_month);

-- 4. Partition helper function
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
  END LOOP;
END $$;

-- 5. Ensure unique constraint on daily_afterglow (check if exists first)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'daily_afterglow_uniq' 
    AND table_name = 'daily_afterglow'
  ) THEN
    ALTER TABLE public.daily_afterglow
    ADD CONSTRAINT daily_afterglow_uniq UNIQUE (user_id,date);
  END IF;
END $$;

-- 6. Optimized matcher function using geohash5
CREATE OR REPLACE FUNCTION public.match_unmatched_pings()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE 
  inserted INT := 0;
BEGIN
  WITH candidates AS (
    SELECT DISTINCT ON (rl.user_id, v.id)
           rl.user_id,
           rl.captured_at,
           v.id AS venue_id,
           ST_Distance(rl.geom::geography, v.geom::geography)::NUMERIC AS dist
    FROM   public.raw_locations rl
    JOIN   public.venues v 
           ON substr(ST_GeoHash(rl.geom,5),1,5) = v.geohash5
           AND ST_DWithin(rl.geom::geography, v.geom::geography, v.radius_m)
    WHERE  rl.captured_at >= now() - INTERVAL '15 minutes'
      AND  NOT EXISTS (
             SELECT 1 FROM public.venue_visits pv
             WHERE  pv.user_id = rl.user_id
               AND  pv.venue_id = v.id
               AND  rl.captured_at - pv.arrived_at < INTERVAL '20 minutes'
           )
    ORDER BY rl.user_id, v.id, dist ASC
  )
  INSERT INTO public.venue_visits(user_id, venue_id, arrived_at, distance_m)
  SELECT user_id, venue_id, captured_at, dist
  FROM   candidates
  ON CONFLICT (user_id, venue_id, arrived_at) DO NOTHING;

  GET DIAGNOSTICS inserted = ROW_COUNT;
  RETURN inserted;
END $$;