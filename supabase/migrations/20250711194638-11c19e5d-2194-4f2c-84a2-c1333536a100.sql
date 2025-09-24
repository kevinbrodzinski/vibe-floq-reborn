-- ============================================================
--  FLOQ • CORE BACK-END SCHEMA (v0.9 – TestFlight)
-- ============================================================

-- ░░ EXTENSIONS ░░
create extension if not exists "pgcrypto";

-- ============================================================
-- 1.  USER → USER  FRIENDSHIPS
-- ============================================================
create table if not exists public.friendships (
  user_id     uuid   not null references auth.users on delete cascade,
  friend_id   uuid   not null references auth.users on delete cascade,
  created_at  timestamptz default now(),
  primary key (user_id, friend_id)
);

-- --- INDEXES
create index if not exists idx_friendships_user on public.friendships(user_id);
create index if not exists idx_friendships_friend on public.friendships(friend_id);

-- --- RLS
alter table public.friendships enable row level security;

create policy "owner can read"
on public.friendships
for select
using (user_id = auth.uid() or friend_id = auth.uid());

create policy "owner can insert/delete"
on public.friendships
for all
using (user_id = auth.uid());

-- ============================================================
-- 2.  FRIENDSHIP RPC HELPERS
-- ============================================================
create or replace function public.add_friend(target uuid)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.friendships (user_id, friend_id)
  values (auth.uid(), target)
  on conflict do nothing;
end;
$$;

create or replace function public.remove_friend(target uuid)
returns void
language plpgsql
security definer
as $$
begin
  delete from public.friendships
  where user_id = auth.uid()
    and friend_id = target;
end;
$$;

-- ============================================================
-- 3.  REAL-TIME VIBE STATE  (broadcast + history lite)
-- ============================================================
create type vibe_enum as enum (
  'chill','hype','social','curious','flowing',
  'open','solo','romantic','weird','down'
);

create table if not exists public.user_vibe_states (
  user_id      uuid         not null references auth.users on delete cascade,
  vibe_tag     vibe_enum    not null,
  started_at   timestamptz  not null default now(),
  location     geography(point,4326),
  active       boolean      default true,
  visible_to   text         default 'public', -- 'public' | 'mutuals' | 'private'
  primary key (user_id)
);

-- --- INDEXES
create index if not exists idx_vibe_active on public.user_vibe_states(active);
create index if not exists idx_vibe_location on public.user_vibe_states using gist(location);

-- --- RLS
alter table public.user_vibe_states enable row level security;

--  Everyone may read *public* vibe, mutuals may read *mutual*.
create policy "can read permitted vibes"
on public.user_vibe_states
for select
using (
  visible_to = 'public'
  or (visible_to = 'mutuals'
      and exists (
        select 1
        from public.friendships f
        where f.user_id   = auth.uid()
          and f.friend_id = user_vibe_states.user_id
      )
     )
  or user_vibe_states.user_id = auth.uid()
);

--  Only owner may insert/update their vibe row
create policy "owner can upsert vibe"
on public.user_vibe_states
for all
using (user_id = auth.uid());

-- ============================================================
-- 4.  LIVE VENUE PRESENCE  (light-weight, 2-minute TTL)
-- ============================================================
create table if not exists public.venue_live_presence (
  venue_id    uuid           not null,
  user_id     uuid           not null,
  vibe        vibe_enum      not null,
  checked_in  timestamptz    default now(),
  expires_at  timestamptz    default (now() + interval '2 minutes'),
  primary key (venue_id, user_id)
);

create index if not exists idx_presence_venue_expires
  on public.venue_live_presence (venue_id, expires_at);

-- --- RLS
alter table public.venue_live_presence enable row level security;

create policy "presence public read active only"
on public.venue_live_presence
for select
using (expires_at > now());

create policy "owner manage own presence"
on public.venue_live_presence
for all
using (user_id = auth.uid());

-- ============================================================
-- 5.  FLOQ (ephemeral groups)
-- ============================================================
create table if not exists public.floqs (
  id           uuid    primary key default gen_random_uuid(),
  name         text,
  type         text    default 'auto', -- auto | planned | persistent
  vibe_tag     vibe_enum,
  location     geography(point,4326),
  created_at   timestamptz default now(),
  expires_at   timestamptz
);

create table if not exists public.floq_members (
  floq_id      uuid    references public.floqs on delete cascade,
  user_id      uuid    references auth.users on delete cascade,
  joined_at    timestamptz default now(),
  role         text default 'member',
  primary key (floq_id, user_id)
);

alter table public.floqs enable row level security;
alter table public.floq_members enable row level security;

create policy "floqs are public read"
on public.floqs
for select
using (true);

create policy "member can read own floq membership"
on public.floq_members
for select
using (user_id = auth.uid());

create policy "anyone can join public floq"
on public.floq_members
for insert
with check (user_id = auth.uid());

-- ============================================================
-- 6.  HOUSEKEEPING  JOBS
-- ============================================================
-- Auto purge expired presence & vibe rows
create or replace function public.cleanup_expired_rows()
returns void
language plpgsql
as $$
begin
  delete from public.venue_live_presence where expires_at < now();
  delete from public.user_vibe_states   where active = true and started_at < now() - interval '12 hours';
end;
$$;

-- (If you run pg_cron, schedule it every 5 min)
-- select cron.schedule('cleanup', '*/5 * * * *', $$ select public.cleanup_expired_rows(); $$);

-- ============================================================
-- 7.  NICE-TO-HAVE  INDEX HINTS (optional)
-- ============================================================
-- For vibe matching queries ("people within 2 km with same vibe")
create index if not exists idx_vibe_active_loc
  on public.user_vibe_states using gist (location)
  where active = true;

-- ============================================================
-- 🎉  SCHEMA COMPLETE
-- ============================================================