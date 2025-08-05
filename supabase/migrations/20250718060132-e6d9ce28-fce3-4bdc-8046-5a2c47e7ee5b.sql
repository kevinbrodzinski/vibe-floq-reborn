-- ============================================================================
--  Field  ❙  Phase-1  ❙  Aggregation + Toggle  (v1.0)
-- ----------------------------------------------------------------------------
--  • Adds geohash-based tile cache (field_tiles)
--  • Derives geohash once (generated column) to avoid per-scan PostGIS cost
--  • Schedules 5-second refresh via pg_cron
--  • Sets up RLS: public read, service manage
--  • Adds user-level feature flag `field_enabled`
-- ============================================================================

-- 0. PRE-REQS ---------------------------------------------------------------
create extension if not exists postgis;
create extension if not exists pg_cron;
create extension if not exists pgcrypto;        -- (uuid tools if needed)

-- 1. AUGMENT vibes_now -------------------------------------------------------
--    Store geohash-5 *once*; keeps refresh CPU low
alter table public.vibes_now
add column if not exists gh5 text
    generated always as ( substring( st_geohash(location::geometry, 5) from 1 for 5) ) stored;

create index if not exists vibes_now_gh5_idx on public.vibes_now (gh5);
create index if not exists vibes_now_active_idx on public.vibes_now (expires_at);

-- 2. TILE CACHE TABLE --------------------------------------------------------
create table if not exists public.field_tiles (
  tile_id            text  primary key,                 -- geohash-5
  crowd_count        integer         not null default 0,
  avg_vibe           jsonb           not null default '{"h":0,"s":0,"l":0}',
  active_floq_ids    uuid[]          not null default '{}',
  updated_at         timestamptz     not null default now()
);

create index if not exists field_tiles_updated_at_idx on public.field_tiles (updated_at);

-- 3. RLS ---------------------------------------------------------------------
alter table public.field_tiles enable row level security;

-- Public (anon + authed) can read tiles
create policy if not exists field_tiles_read
  on public.field_tiles
  for select
  using (true);

-- Service role (& cron) may do anything
create policy if not exists field_tiles_service_manage
  on public.field_tiles
  for all
  using ( pg_has_role( NULL, 'service_role', 'member') );

-- 4. REFRESH FUNCTION --------------------------------------------------------
create or replace function public.refresh_field_tiles()
returns void
language plpgsql
security definer                              -- executed as table owner
set search_path to 'public'
as $$
begin
  -- Aggregate live presence into tiles
  with agg as (
    select
      gh5                                           as tile_id,
      count(*)::int                                 as crowd_count,
      jsonb_build_object(
        'h', avg(vibe_h)::real,
        's', avg(vibe_s)::real,
        'l', avg(vibe_l)::real
      )                                            as avg_vibe,
      array_agg(distinct floq_id)                  as active_floq_ids
    from public.vibes_now
    where expires_at > now()
    group by gh5
  )
  insert into public.field_tiles(tile_id, crowd_count, avg_vibe, active_floq_ids, updated_at)
  select tile_id, crowd_count, avg_vibe, active_floq_ids, now()
  from   agg
  on conflict (tile_id) do update
    set crowd_count     = excluded.crowd_count,
        avg_vibe        = excluded.avg_vibe,
        active_floq_ids = excluded.active_floq_ids,
        updated_at      = excluded.updated_at;

  -- Trim out tiles stale > 5 min (cheap HOT delete)
  delete from public.field_tiles
  where updated_at < now() - interval '5 minutes';
end;
$$;

grant execute on function public.refresh_field_tiles() to service_role;

-- 5. CRON JOB (every 5 s) ----------------------------------------------------
select cron.schedule(
  'refresh_field_tiles_5s',
  '*/5 * * * * *',               -- second-granularity pattern
  $$select public.refresh_field_tiles();$$
);

-- 6. USER FEATURE FLAG -------------------------------------------------------
alter table public.user_settings
  add column if not exists field_enabled boolean not null default false;

-- Ensure defaults applied to existing rows
update public.user_settings
  set field_enabled = coalesce(field_enabled, false)
  where field_enabled is null;