-- 1. event_areas (simple circle geofence; can extend to polygons later)
create type public.event_shape as enum ('circle');

create table if not exists public.event_areas (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  lat         numeric(9,6) not null,
  lng         numeric(9,6) not null,
  radius_m    integer not null,          -- circle radius
  vibe        text,
  starts_at   timestamptz default now(),
  ends_at     timestamptz default (now() + interval '4 hour'),
  shape       public.event_shape default 'circle'
);

create index if not exists idx_event_areas_time
  on public.event_areas (starts_at, ends_at);

-- 2. RPC: events_containing_point
create or replace function public.events_containing_point(
  user_lat numeric,
  user_lng numeric
)
returns table (
  id uuid,
  name text,
  vibe text,
  radius_m integer
)
language sql stable security definer
as $$
  select id, name, vibe, radius_m
  from public.event_areas
  where now() between starts_at and ends_at
    and ST_DWithin(
        ST_SetSRID(ST_MakePoint(user_lng, user_lat),4326)::geography,
        ST_SetSRID(ST_MakePoint(lng, lat),4326)::geography,
        radius_m
      );
$$;

grant execute on function public.events_containing_point to anon, authenticated;

-- 3. presence visibility
alter type public.vibe_visibility add value if not exists 'friends';

alter table public.vibes_now
  add column if not exists vibe_visibility vibe_visibility default 'public';