/* -------------------------------------------------------------
   Phase-4  —  Helper tables, indexes, back-fill, RLS, utilities
   ----------------------------------------------------------- */

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
-- 2. Indexes  
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
-- 3. Metadata back-fill
---------------------------------------------------------------
UPDATE public.afterglow_moments
SET metadata = 
  jsonb_build_object(
    'location', jsonb_build_object(
      'coordinates', CASE 
        WHEN location_geom IS NOT NULL 
        THEN jsonb_build_array(ST_X(location_geom), ST_Y(location_geom))
        ELSE 'null'::jsonb
      END,
      'venue_name', 'null'::jsonb,
      'venue_id', 'null'::jsonb,
      'distance_from_previous', 0
    ),
    'people', jsonb_build_object(
      'count', 0,
      'encountered', '[]'::jsonb
    ),
    'social_context', jsonb_build_object(
      'floq_id', 'null'::jsonb,
      'venue_activity_level', '"unknown"'::jsonb
    ),
    'vibe', COALESCE(metadata -> 'vibe', '"neutral"'::jsonb),
    'intensity', COALESCE(metadata -> 'intensity', '0.5'::jsonb)
  ) || COALESCE(metadata, '{}'::jsonb)
WHERE NOT (metadata ? 'location' AND metadata ? 'people' AND metadata ? 'social_context');

---------------------------------------------------------------
-- 4. Row-Level Security
---------------------------------------------------------------
alter table public.afterglow_people  enable row level security;
alter table public.afterglow_venues  enable row level security;

create policy afterglow_people_owner
    on public.afterglow_people
    for all
    using (
      exists (
        select 1
        from   public.afterglow_moments am
        join   public.daily_afterglow   da on da.id = am.daily_afterglow_id
        where  am.id     = afterglow_people.moment_id
          and  da.user_id = auth.uid()
      )
    )
    with check (
      exists (
        select 1
        from   public.afterglow_moments am
        join   public.daily_afterglow   da on da.id = am.daily_afterglow_id
        where  am.id     = afterglow_people.moment_id
          and  da.user_id = auth.uid()
      )
    );

create policy afterglow_venues_owner
    on public.afterglow_venues
    for all
    using (
      exists (
        select 1
        from   public.afterglow_moments am
        join   public.daily_afterglow   da on da.id = am.daily_afterglow_id
        where  am.id     = afterglow_venues.moment_id
          and  da.user_id = auth.uid()
      )
    )
    with check (
      exists (
        select 1
        from   public.afterglow_moments am
        join   public.daily_afterglow   da on da.id = am.daily_afterglow_id
        where  am.id     = afterglow_venues.moment_id
          and  da.user_id = auth.uid()
      )
    );

---------------------------------------------------------------
-- 5. Utility function
---------------------------------------------------------------
create or replace function public.calculate_distance_meters(
  lat1 double precision, 
  lng1 double precision,
  lat2 double precision, 
  lng2 double precision
) returns numeric
language plpgsql
immutable
as $$
declare
  r double precision := 6371000;
  phi1 double precision;
  phi2 double precision;
  dphi double precision;
  dlambda double precision;
  a double precision;
  c double precision;
begin
  phi1 := radians(lat1);
  phi2 := radians(lat2);
  dphi := radians(lat2 - lat1);
  dlambda := radians(lng2 - lng1);
  
  a := sin(dphi / 2)^2 + cos(phi1) * cos(phi2) * sin(dlambda / 2)^2;
  c := 2 * atan2(sqrt(a), sqrt(1 - a));
  
  return (r * c)::numeric;
end$$;