-- 1) Stub RPC: returns JSONB array of cells (center, pressure, temperature, humidity, wind)
create or replace function public.get_social_forecast(
  t text, range text, center double precision[], bbox double precision[], zoom int
) returns jsonb
language sql security invoker as $$
with params as (
  select coalesce(center, array[-118.4695,33.9855])::double precision[] as c,
         greatest(3, least(18, coalesce(zoom,14)))                       as z
), offsets as (
  select dx, dy from (values
    (-0.003, -0.003), ( 0.000, -0.003), ( 0.003, -0.003),
    (-0.003,  0.000), ( 0.000,  0.000), ( 0.003,  0.000),
    (-0.003,  0.003), ( 0.000,  0.003), ( 0.003,  0.003)
  ) v(dx,dy)
)
select jsonb_agg(
  jsonb_build_object(
    'key', format('sf:%s:%s', round((p.c[1]+o.dx)::numeric,5), round((p.c[2]+o.dy)::numeric,5)),
    'center', jsonb_build_array( p.c[1]+o.dx, p.c[2]+o.dy ),
    'pressure', 0.35 + ((abs(o.dx)+abs(o.dy)) * 4)::double precision / 10,
    'temperature', 0.42,
    'humidity', 0.5,
    'wind', jsonb_build_array( 1, 0 )
  )
)
from params p cross join offsets o;
$$;