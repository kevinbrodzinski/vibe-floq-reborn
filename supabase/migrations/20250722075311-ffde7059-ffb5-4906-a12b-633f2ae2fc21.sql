-- Enhanced sync_log table with RLS policies
DROP TABLE IF EXISTS public.sync_log CASCADE;

CREATE TABLE public.sync_log (
  id        BIGSERIAL PRIMARY KEY,
  kind      TEXT          NOT NULL,   -- e.g. 'google_places'
  lat       DOUBLE PRECISION NOT NULL,
  lng       DOUBLE PRECISION NOT NULL,
  ts        TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- we'll usually query "latest sync by kind for this ~bucket"
CREATE INDEX sync_log_kind_ts_ix
  ON public.sync_log (kind, ts DESC);

-- row-level security: anyone can insert, anyone can read
ALTER TABLE public.sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sync_log_select" ON public.sync_log
  FOR SELECT USING (true);

CREATE POLICY "sync_log_insert" ON public.sync_log
  FOR INSERT WITH CHECK (true);

-- Enhanced venues_within_radius function with custom return type
DROP FUNCTION IF EXISTS public.venues_within_radius;

CREATE OR REPLACE FUNCTION public.venues_within_radius(
  center_lat  double precision,
  center_lng  double precision,
  r_m         integer default 1200
)
RETURNS TABLE (
  id           uuid,
  name         text,
  address      text,
  categories   text[],
  rating       numeric,
  photo_url    text,
  lat          double precision,
  lng          double precision,
  distance_m   double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER  -- so anon can call but cannot select whole table
AS $$
  SELECT
    v.id,
    v.name,
    v.address,
    v.categories,
    v.rating,
    v.photo_url,
    v.lat,
    v.lng,
    ST_Distance(
      v.geom,
      ST_SetSRID(ST_MakePoint(center_lng, center_lat),4326)
    )          as distance_m
  FROM public.venues v
  WHERE ST_DWithin(
          v.geom,
          ST_SetSRID(ST_MakePoint(center_lng, center_lat),4326),
          r_m
        )
  ORDER BY distance_m
  LIMIT 50;
$$;

GRANT EXECUTE ON FUNCTION public.venues_within_radius TO anon, authenticated;