/* -------------------------------------------------------------
   Phase-4  —  Helper tables, indexes, back-fill, RLS, utilities
   All statements are safe in a single TX.  No CONCURRENTLY used.
   ----------------------------------------------------------- */

---------------------------------------------------------------
-- 0.  (Safety)  Required extensions
---------------------------------------------------------------
create extension if not exists postgis        with schema public;
create extension if not exists "uuid-ossp"    with schema public;

---------------------------------------------------------------
-- 1. Helper tables
---------------------------------------------------------------
create table if not exists public.afterglow_people
(
  moment_id             uuid not null
                              references public.afterglow_moments(id)
                              on delete cascade,
  person_id             uuid not null
                              references public.profiles(id)
                              on delete cascade,
  interaction_strength  numeric(3,2) default 0.50
                              check (interaction_strength between 0 and 1),
  shared_moments_count  integer       default 1,
  created_at            timestamptz   default now(),
  primary key (moment_id, person_id)
);

create table if not exists public.afterglow_venues
(
  moment_id   uuid not null
                    references public.afterglow_moments(id)
                    on delete cascade,
  venue_id    uuid,
  name        text not null,
  lat         numeric(10,7) not null,
  lng         numeric(10,7) not null,
  venue_type  text           default 'unknown',
  created_at  timestamptz    default now(),
  primary key (moment_id)
);

---------------------------------------------------------------
-- 2. Indexes  (plain CREATE – runs fine inside a TX)
---------------------------------------------------------------

-- afterglow_people
create index if not exists idx_afterglow_people__person
    on public.afterglow_people (person_id);

create index if not exists idx_afterglow_people__moment
    on public.afterglow_people (moment_id);

-- afterglow_venues
create index if not exists idx_afterglow_venues__lat_lng
    on public.afterglow_venues (lat, lng);

create index if not exists idx_afterglow_venues__name
    on public.afterglow_venues (name);

-- afterglow_moments JSON helpers
create index if not exists idx_moments__people_count
    on public.afterglow_moments
    using gin ((metadata -> 'people' -> 'count'));

create index if not exists idx_moments__location_coords
    on public.afterglow_moments
    using gin ((metadata -> 'location' -> 'coordinates'));

---------------------------------------------------------------
-- 3. Metadata back-fill  (batched loop, no LIMIT-in-UPDATE)
---------------------------------------------------------------
do $$
declare
  _batch int := 5_000;
  _touched int;
begin
  loop
    with todo as (
      select id, metadata, location_geom
      from   public.afterglow_moments
      where  not (metadata ? 'location'
               and metadata ? 'people'
               and metadata ? 'social_context')
      limit  _batch
      for update skip locked
    )
    update public.afterglow_moments m
    set    metadata =
             jsonb_build_object(
               'location',        jsonb_build_object(
                                     'coordinates',
                                       case
                                         when todo.location_geom is not null
                                              then jsonb_build_array(
                                                     st_x(todo.location_geom),
                                                     st_y(todo.location_geom)
                                                   )
                                         else null::jsonb
                                       end,
                                     'venue_name', null::text,
                                     'venue_id',   null::uuid,
                                     'distance_from_previous', 0
                                   ),
               'people',          jsonb_build_object(
                                     'count',      0,
                                     'encountered', jsonb_build_array()
                                   ),
               'social_context',  jsonb_build_object(
                                     'floq_id', null::uuid,
                                     'venue_activity_level', 'unknown'::text
                                   ),
               'vibe',       coalesce(m.metadata -> 'vibe',
                                      to_jsonb('neutral')),
               'intensity',  coalesce(m.metadata -> 'intensity',
                                      to_jsonb(0.5))
             ) || coalesce(m.metadata, '{}'::jsonb)
    from   todo
    where  m.id = todo.id;

    get diagnostics _touched = row_count;
    exit when _touched = 0;
    raise notice 'patched % legacy moments', _touched;
  end loop;
end$$;

---------------------------------------------------------------
-- 4. Row-Level Security
---------------------------------------------------------------
alter table public.afterglow_people  enable row level security;
alter table public.afterglow_venues  enable row level security;

/* Helpers: we want "same-owner-as-moment" semantics            */
create policy afterglow_people_owner
    on public.afterglow_people
    using (
      exists (
        select 1
        from   public.afterglow_moments am
        join   public.daily_afterglow   da on da.id = am.daily_afterglow_id
        where  am.id     = afterglow_people.moment_id
          and  da.user_id = auth.uid()
      )
    )
    with check (true);   -- same predicate for write paths

create policy afterglow_venues_owner
    on public.afterglow_venues
    using (
      exists (
        select 1
        from   public.afterglow_moments am
        join   public.daily_afterglow   da on da.id = am.daily_afterglow_id
        where  am.id     = afterglow_venues.moment_id
          and  da.user_id = auth.uid()
      )
    )
    with check (true);

---------------------------------------------------------------
-- 5. Utility functions
---------------------------------------------------------------

/* Haversine – lat / lng order is (lat, lng) for clarity        */
create or replace function public.calculate_distance_meters(
  lat1 double precision, lng1 double precision,
  lat2 double precision, lng2 double precision
) returns numeric
language plpgsql
immutable
as $$
declare
  r       double precision := 6371000;
  phi1    double precision := radians(lat1);
  phi2    double precision := radians(lat2);
  dphi    double precision := radians(lat2 - lat1);
  dlambda double precision := radians(lng2 - lng1);
  a       double precision:= sin(dphi / 2)^2
       + cos(phi1) * cos(phi2) * sin(dlambda / 2)^2;

  return (r * 2 * atan2(sqrt(a), sqrt(1 - a)))::numeric;
end $$;

/* -------------------------------------------------------------
   6. Convenience VIEW  – all metadata flattened for quick reads
   ----------------------------------------------------------- */
create or replace view public.v_afterglow_moment_flat as
select
  m.id,
  m.timestamp,
  m.title,
  m.description,
  /* ---- Location ---- */
  (m.metadata -> 'location' ->> 'venue_name')              as venue_name,
  (m.metadata -> 'location' ->> 'venue_id')::uuid          as venue_id,
  (m.metadata -> 'location' -> 'coordinates')              as coordinates,
  (m.metadata -> 'location' ->> 'distance_from_previous')::numeric
                                                          as distance_from_previous,
  /* ---- People ---- */
  (m.metadata -> 'people' ->> 'count')::int                as people_count,
  (m.metadata -> 'people' -> 'encountered')                as encountered_people,
  /* ---- Social ---- */
  (m.metadata -> 'social_context' ->> 'floq_id')::uuid     as floq_id,
  (m.metadata -> 'social_context' ->> 'venue_activity_level')
                                                          as venue_activity_level,
  /* ---- Vibe ---- */
  coalesce(m.metadata ->> 'vibe',       'neutral')         as vibe,
  coalesce((m.metadata ->> 'intensity')::numeric, 0.5)     as intensity
from public.afterglow_moments m;

/* -------------------------------------------------------------
   7. Helper trigger – keep "distance_from_previous" up-to-date
   ----------------------------------------------------------- */
create or replace function public.set_distance_from_previous()
returns trigger
language plpgsql
security definer
as $$
declare
  prev_coords jsonb;
  this_coords jsonb;
  dist numeric := 0;
begin
  /* new row's coordinates */
  this_coords := new.metadata -> 'location' -> 'coordinates';

  /* only run if we actually have coords */
  if this_coords is null then
    return new;
  end if;

  /* grab previous moment (same daily_afterglow, immediately earlier) */
  select metadata -> 'location' -> 'coordinates'
  into   prev_coords
  from   public.afterglow_moments
  where  daily_afterglow_id = new.daily_afterglow_id
    and  timestamp           < new.timestamp
  order  by timestamp desc
  limit  1;

  if prev_coords is not null then
    dist := public.calculate_distance_meters(
              (prev_coords->>1)::double precision,   -- lat
              (prev_coords->>0)::double precision,   -- lng
              (this_coords->>1)::double precision,   -- lat
              (this_coords->>0)::double precision    -- lng
            );
  end if;

  /* splice back into metadata */
  new.metadata :=
      jsonb_set(
        new.metadata,
        '{location,distance_from_previous}',
        to_jsonb(round(dist)::int),
        true
      );

  return new;
end $$;

drop trigger if exists trg_set_distance_prev on public.afterglow_moments;

create trigger trg_set_distance_prev
before insert or update of metadata
on public.afterglow_moments
for each row
execute procedure public.set_distance_from_previous();

/* -------------------------------------------------------------
   8. Final sanity-check query (runs at migration time only)
   ----------------------------------------------------------- */
do $$
declare
  _missing int;
begin
  select count(*)
  into   _missing
  from   public.afterglow_moments
  where  not (metadata ? 'location'
          and metadata ? 'people'
          and metadata ? 'social_context');

  raise notice 'afterglow_moments still missing metadata → %', _missing;
end $$;