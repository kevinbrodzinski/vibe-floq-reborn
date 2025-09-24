-- 0) Enable PostGIS once per DB
create extension if not exists postgis;

-- 1) Drop existing geo column to allow type changes
alter table public.venues drop column if exists geo;

-- 2) new columns (nullable first)
alter table public.venues
  add column if not exists provider     text,
  add column if not exists provider_id  text,
  add column if not exists address      text,
  add column if not exists categories   text[],
  add column if not exists rating       numeric,
  add column if not exists photo_url    text,
  add column if not exists updated_at   timestamptz default now();

-- 3) widen coords if needed
alter table public.venues
  alter column lat type double precision,
  alter column lng type double precision;

-- 4) geometry helper (create geom column)
alter table public.venues
  add column if not exists geom geography(point,4326)
  generated always as (ST_SetSRID(ST_MakePoint(lng,lat),4326)) stored;

-- 5) back-fill provider cols ONCE
update public.venues
set    provider     = coalesce(provider,'manual'),
       provider_id  = coalesce(provider_id, id::text)
where  provider is null or provider_id is null;

-- 6) now we can enforce uniqueness / not-null
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints 
    where constraint_name = 'venues_provider_unique' and table_name = 'venues'
  ) then
    alter table public.venues 
      add constraint venues_provider_unique unique(provider, provider_id);
  end if;
end$$;

alter table public.venues
  alter column provider    set not null,
  alter column provider_id set not null;

-- 7) indexes
create index if not exists venues_gix       on public.venues using gist (geom);
create index if not exists venues_provider_ix on public.venues(provider, provider_id);

-- 8) RLS (public read)
alter table public.venues enable row level security;
drop policy if exists venues_public_read on public.venues;
create policy venues_public_read
  on public.venues for select using (true);