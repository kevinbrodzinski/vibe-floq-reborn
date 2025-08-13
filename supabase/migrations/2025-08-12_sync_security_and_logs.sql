-- 2025-08-12_sync_security_and_logs.sql
begin;

-- 1) Group each sync call
create table if not exists public.venue_import_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  params jsonb not null,                 -- {lat,lng,radius_m,limit,providers,dry_run,density,...}
  caller text,                           -- x-forwarded-for / user-agent
  status text not null default 'started' -- started|done|error
);

-- 2) Per-place dedupe decisions
create table if not exists public.dedupe_decisions (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.venue_import_runs(id) on delete cascade,
  place_name text not null,
  provider text not null,
  provider_id text not null,
  lat double precision not null,
  lng double precision not null,
  address text,
  decision text not null check (decision in ('alias','match','insert','skip')),
  matched_venue_id uuid,                 -- when alias/match
  dist_m int,
  name_sim numeric,
  addr_sim numeric,
  radius_m int not null,
  thresholds jsonb not null,             -- {name_sim, addr_sim}
  notes jsonb default '{}'::jsonb,       -- free-form: {reason, merged_fields, ...}
  created_at timestamptz not null default now()
);

-- Add indexes for performance
create index if not exists idx_venue_import_runs_started_at on public.venue_import_runs(started_at desc);
create index if not exists idx_venue_import_runs_status on public.venue_import_runs(status);
create index if not exists idx_dedupe_decisions_run_id on public.dedupe_decisions(run_id);
create index if not exists idx_dedupe_decisions_decision on public.dedupe_decisions(decision);
create index if not exists idx_dedupe_decisions_created_at on public.dedupe_decisions(created_at desc);
create index if not exists idx_dedupe_decisions_provider on public.dedupe_decisions(provider, provider_id);

-- Helper function to track interactions
create or replace function public.track_interaction(
  p_profile_id uuid,
  p_venue_id uuid,
  p_type text,
  p_weight numeric default 0.0,
  p_context jsonb default '{}'
) returns void language plpgsql as $$
begin
  insert into public.venue_interactions(profile_id, venue_id, interaction_type, weight, context)
  values (p_profile_id, p_venue_id, p_type, p_weight, p_context);

  -- Update user_venue_stats if the table exists
  if exists (select 1 from information_schema.tables where table_name = 'user_venue_stats') then
    insert into public.user_venue_stats(profile_id, venue_id, visits, likes, dislikes, last_interaction)
    values (p_profile_id, p_venue_id,
            case when p_type='checkin' then 1 else 0 end,
            case when p_type='like' then 1 else 0 end,
            case when p_type='dislike' then 1 else 0 end,
            now())
    on conflict (profile_id, venue_id) do update
    set visits = user_venue_stats.visits + (case when p_type='checkin' then 1 else 0 end),
        likes  = user_venue_stats.likes  + (case when p_type='like' then 1 else 0 end),
        dislikes = user_venue_stats.dislikes + (case when p_type='dislike' then 1 else 0 end),
        last_interaction = now();
  end if;
end$$;

-- Helper function to update user tastes
create or replace function public.upsert_user_tastes(
  p_profile_id uuid,
  p_json jsonb
) returns void language plpgsql as $$
begin
  insert into public.user_tastes(profile_id, preferred_cuisines, disliked_cuisines,
    preferred_tags, disliked_tags, dietary, vibe_preference, price_min, price_max,
    distance_max_m, open_now_only, updated_at)
  values (
    p_profile_id,
    coalesce( (select array(select jsonb_array_elements_text(p_json->'preferred_cuisines'))), '{}'),
    coalesce( (select array(select jsonb_array_elements_text(p_json->'disliked_cuisines'))), '{}'),
    coalesce( (select array(select jsonb_array_elements_text(p_json->'preferred_tags'))), '{}'),
    coalesce( (select array(select jsonb_array_elements_text(p_json->'disliked_tags'))), '{}'),
    coalesce( (select array(select jsonb_array_elements_text(p_json->'dietary'))), '{}'),
    coalesce( (select array(select jsonb_array_elements_text(p_json->'vibe_preference'))), '{}'),
    nullif(p_json->>'price_min','')::int,
    nullif(p_json->>'price_max','')::int,
    coalesce((p_json->>'distance_max_m')::int, 3000),
    coalesce((p_json->>'open_now_only')::boolean, true),
    now()
  )
  on conflict (profile_id) do update set
    preferred_cuisines = excluded.preferred_cuisines,
    disliked_cuisines  = excluded.disliked_cuisines,
    preferred_tags     = excluded.preferred_tags,
    disliked_tags      = excluded.disliked_tags,
    dietary            = excluded.dietary,
    vibe_preference    = excluded.vibe_preference,
    price_min          = excluded.price_min,
    price_max          = excluded.price_max,
    distance_max_m     = excluded.distance_max_m,
    open_now_only      = excluded.open_now_only,
    updated_at         = now();
end$$;

-- Create user_venue_stats table if it doesn't exist
create table if not exists public.user_venue_stats (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  venue_id   uuid not null references public.venues(id) on delete cascade,
  visits int default 0,
  likes  int default 0,
  dislikes int default 0,
  last_interaction timestamptz,
  primary key (profile_id, venue_id)
);

create index if not exists idx_user_venue_stats_profile_id on public.user_venue_stats(profile_id);
create index if not exists idx_user_venue_stats_venue_id on public.user_venue_stats(venue_id);
create index if not exists idx_user_venue_stats_last_interaction on public.user_venue_stats(last_interaction desc);

-- RLS: logs are service-only (no user reads). Enable RLS but create no read policy.
alter table public.venue_import_runs enable row level security;
alter table public.dedupe_decisions enable row level security;

-- user_venue_stats RLS
alter table public.user_venue_stats enable row level security;
create policy if not exists "own venue stats"
on public.user_venue_stats for all
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

commit;