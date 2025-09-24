/* ──────────────────────────────────────────────────────────────── */
/*  Pulse v1 – all schema objects                                  */
/*  created : 2025-07-28                                            */
/* ──────────────────────────────────────────────────────────────── */
begin;

/*─────────────────────────────────────────────────────────────────*
 * 0.  Helpers & ENUMs                                             *
 *─────────────────────────────────────────────────────────────────*/

-- immutable stub timestamp – lets us build partial-indexes
create or replace function public.immutable_now()
returns timestamptz
language sql
immutable
as $$select '2000-01-01 00:00:00+00'::timestamptz;$$;

-- new event-type enum (only if not present)
do $$
begin
  if not exists (select 1
                 from pg_type t
                 join pg_namespace n on n.oid = t.typnamespace
                 where n.nspname = 'public'
                   and t.typname  = 'pulse_event_type')
  then
    create type public.pulse_event_type as enum (
      'check_in','check_out',
      'vibe_join','vibe_leave',
      'floq_join','floq_leave'
    );
  end if;
end$$;

-- extend your existing vibe_tag enum with a few extras
alter type public.vibe_tag
  add value if not exists 'energetic'
  ,  add value if not exists 'zen'
  ,  add value if not exists 'cozy';

/*─────────────────────────────────────────────────────────────────*
 * 1.  venue_visits additions + RLS                                *
 *─────────────────────────────────────────────────────────────────*/

alter table public.venue_visits
  add column if not exists left_at timestamptz;

create index if not exists venue_visits_profile_idx
  on public.venue_visits(profile_id);

create index if not exists venue_visits_arrived_idx
  on public.venue_visits(arrived_at desc);

-- partial index used by the 15-minute window scan
drop index if exists venue_visits_arrived_15m_idx;
create index venue_visits_arrived_15m_idx
  on public.venue_visits(arrived_at)
  where arrived_at >= immutable_now() - interval '15 minutes';

-- RLS (insert / read own rows)
alter table public.venue_visits enable row level security;

create policy if not exists self_insert_visits
  on public.venue_visits
  for insert
  with check (profile_id = auth.uid());

create policy if not exists self_select_visits
  on public.venue_visits
  for select
  using (profile_id = auth.uid());

/* auto-close previous open stay */
create or replace function public.trg_close_prev_visit()
returns trigger
language plpgsql
as $$
begin
  update public.venue_visits
     set left_at = now()
   where profile_id = new.profile_id
     and left_at   is null
     and id       <> new.id;
  return new;
end; $$;

drop trigger if exists t_close_prev_visit on public.venue_visits;
create trigger t_close_prev_visit
  after insert on public.venue_visits
  for each row execute procedure public.trg_close_prev_visit();

/*─────────────────────────────────────────────────────────────────*
 * 2.  pulse_events & venue_discoveries                            *
 *─────────────────────────────────────────────────────────────────*/

create table if not exists public.pulse_events (
  id           bigserial primary key,
  created_at   timestamptz default now(),
  event_type   public.pulse_event_type not null,
  profile_id   uuid references public.profiles(id),
  floq_id      uuid references public.floqs(id),
  venue_id     uuid references public.venues(id),
  vibe_tag     public.vibe_tag,
  people_count int  default 1,
  meta         jsonb default '{}'::jsonb
);

create index if not exists pulse_events_venue_id_idx     on public.pulse_events(venue_id);
create index if not exists pulse_events_floq_id_idx      on public.pulse_events(floq_id);
create index if not exists pulse_events_created_idx      on public.pulse_events(created_at desc);

alter table public.pulse_events enable row level security;

create policy if not exists read_feed
  on public.pulse_events
  for select
  using (true);      -- anyone can read; inserts done by edge function / service-role

/* daily discoveries */
create table if not exists public.venue_discoveries (
  id            bigserial primary key,
  profile_id    uuid references public.profiles(id),
  venue_id      uuid references public.venues(id),
  discovered_at timestamptz default now(),
  constraint uniq_daily_discovery
    unique (profile_id, venue_id, (discovered_at::date))
);

alter table public.venue_discoveries enable row level security;

create policy if not exists own_read
  on public.venue_discoveries
  for select
  using (profile_id = auth.uid());

create policy if not exists own_write
  on public.venue_discoveries
  for insert
  with check (profile_id = auth.uid());

/* trigger: auto-insert discovery when a check-in arrives            */
create or replace function public.trg_auto_discovery()
returns trigger
language plpgsql
as $$
begin
  if (new.event_type = 'check_in') then
    insert into public.venue_discoveries(profile_id, venue_id)
    values (new.profile_id, new.venue_id)
    on conflict do nothing;
  end if;
  return new;
end; $$;

drop trigger if exists t_auto_discovery on public.pulse_events;
create trigger t_auto_discovery
  after insert on public.pulse_events
  for each row execute procedure public.trg_auto_discovery();

/*─────────────────────────────────────────────────────────────────*
 * 3.  Materialised views                                          *
 *─────────────────────────────────────────────────────────────────*/

drop materialized view if exists public.v_venue_people_now cascade;

create materialized view public.v_venue_people_now as
select
  venue_id,
  count(*)         as people_now,
  max(arrived_at)  as last_seen_at
from public.venue_visits
where left_at is null
group by venue_id;

create unique index if not exists v_venue_people_now_pk
  on public.v_venue_people_now(venue_id);


drop materialized view if exists public.v_trending_venues cascade;

create materialized view public.v_trending_venues as
with recent as (
  select venue_id,
         count(*) as visits_15m
  from public.venue_visits
  where arrived_at >= now() - interval '15 minutes'
  group by venue_id
)
select
  nowv.venue_id,
  nowv.people_now,
  recent.visits_15m,
  (nowv.people_now + recent.visits_15m) as trend_score,
  nowv.last_seen_at
from public.v_venue_people_now nowv
join recent using (venue_id);

create unique index if not exists v_trending_venues_pk
  on public.v_trending_venues(venue_id);

/*─────────────────────────────────────────────────────────────────*
 * 4.  RPC helpers                                                 *
 *─────────────────────────────────────────────────────────────────*/

create or replace function public.get_live_activity(
  p_cursor bigint default null,
  p_limit  int    default 20)
returns setof public.pulse_events
language sql stable as $$
  select *
  from public.pulse_events
  where (p_cursor is null or id < p_cursor)
  order by id desc
  limit p_limit;
$$;

create or replace function public.get_trending_venues(
  p_user_lat  double precision,
  p_user_lng  double precision,
  p_radius_m  integer default 2000,
  p_limit     integer default 5)
returns table (
  venue_id     uuid,
  name         text,
  distance_m   integer,
  people_now   integer,
  last_seen_at timestamptz,
  trend_score  integer)
language sql stable as $$
  select
    tv.venue_id,
    v.name,
    ST_Distance(
      v.location::geography,
      ST_SetSRID(ST_Point(p_user_lng, p_user_lat), 4326)::geography
    )::int                                          as distance_m,
    tv.people_now,
    tv.last_seen_at,
    tv.trend_score
  from public.v_trending_venues tv
  join public.venues v on v.id = tv.venue_id
  where ST_DWithin(
          v.location::geography,
          ST_SetSRID(ST_Point(p_user_lng, p_user_lat), 4326)::geography,
          p_radius_m)
  order by tv.trend_score desc
  limit p_limit;
$$;

/*─────────────────────────────────────────────────────────────────*
 * 5.  (optional) pg_cron refresh jobs – run once per minute       *
 *      ⚠️  If your project doesn't have pg_cron, create these     *
 *      by hand in the dashboard scheduler instead.                *
 *─────────────────────────────────────────────────────────────────*/
do $$
begin
  -- requires pg_cron extension + supabase cron role
  create extension if not exists pg_cron;

  perform cron.schedule(
      'refresh_v_people_now',
      '*/1 * * * *',      -- every minute
      $$refresh materialized view concurrently public.v_venue_people_now$$
  ) on conflict do nothing;

  perform cron.schedule(
      'refresh_v_trending',
      '*/1 * * * *',
      $$refresh materialized view concurrently public.v_trending_venues$$
  ) on conflict do nothing;
exception
  when others then null;  -- ignore if pg_cron not available
end$$;

commit; 