-- SQL helper function for venues within radius
create or replace function public.venues_within_radius(
  center_lat double precision,
  center_lng double precision,
  r_m        integer
)
returns setof public.venues
language sql stable as $$
  select *
  from public.venues
  where ST_DWithin(
    geom,
    ST_SetSRID(ST_MakePoint(center_lng, center_lat),4326)::geography,
    r_m
  )
  order by rating desc nulls last, updated_at desc
  limit 50;
$$;