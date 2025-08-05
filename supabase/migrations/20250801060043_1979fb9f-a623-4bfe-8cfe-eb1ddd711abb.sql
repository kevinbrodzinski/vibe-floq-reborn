BEGIN;

DROP FUNCTION IF EXISTS public.get_nearby_venues(double precision,double precision,integer,integer);

create or replace function public.get_nearby_venues(
  p_lat     double precision,
  p_lng     double precision,
  p_radius  integer default 1000,            -- metres
  p_limit   integer default 25
)
returns table (
  id uuid,
  name text,
  lat double precision,
  lng double precision,
  address text,
  categories text[],
  rating numeric,
  price_tier text,
  distance_m numeric
)
language sql stable as $$
  with me as (
    select ST_SetSRID(ST_MakePoint(p_lng, p_lat),4326)::geography as g
  )
  select
    v.id, v.name, v.lat, v.lng, v.address,
    v.categories, v.rating, v.price_tier,
    ST_Distance(v.geom, me.g) as distance_m
  from venues v, me
  where ST_DWithin(v.geom, me.g, p_radius)
  order by distance_m
  limit p_limit;
$$;

grant execute on function public.get_nearby_venues to authenticated, anon;

COMMIT;