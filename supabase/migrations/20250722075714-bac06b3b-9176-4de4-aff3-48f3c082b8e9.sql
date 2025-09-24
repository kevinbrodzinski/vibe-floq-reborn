-- Add RLS policy for client-side sync_log inserts
CREATE POLICY "anyone_insert_google_sync" ON public.sync_log 
  FOR INSERT 
  WITH CHECK (kind = 'google_places');

-- Update venues_within_radius to order by distance
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
SECURITY DEFINER
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
  ORDER BY v.geom <-> ST_SetSRID(ST_MakePoint(center_lng, center_lat),4326)
  LIMIT 50;
$$;