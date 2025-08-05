-- ============================================================
--  FLOQ • CORE BACK-END SCHEMA (v0.9 – TestFlight) - Modified
-- ============================================================

-- ░░ EXTENSIONS ░░
create extension if not exists "pgcrypto";

-- ============================================================
-- 1.  USER → USER  FRIENDSHIPS (already exists, skip)
-- ============================================================
-- Note: friendships table already exists with compatible structure

-- ============================================================
-- 2.  FRIENDSHIP RPC HELPERS (update existing functions)
-- ============================================================
create or replace function public.add_friend(target uuid)
returns void
language plpgsql
security definer
set search_path = public
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
set search_path = public
as $$
begin
  delete from public.friendships
  where user_id = auth.uid()
    and friend_id = target;
end;
$$;

-- ============================================================
-- 3.  REAL-TIME VIBE STATE  (using existing vibe_enum)
-- ============================================================
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
-- 4.  LIVE VENUE PRESENCE  (update existing table structure)
-- ============================================================
-- Add missing columns to existing venue_live_presence table
alter table public.venue_live_presence 
add column if not exists checked_in timestamptz default now();

-- Update existing indexes
create index if not exists idx_presence_venue_expires
  on public.venue_live_presence (venue_id, expires_at);

-- ============================================================
-- 5.  FLOQ (ephemeral groups) - update existing structure
-- ============================================================
-- Add missing columns to existing floqs table
alter table public.floqs 
add column if not exists name text,
add column if not exists type text default 'auto',
add column if not exists vibe_tag vibe_enum,
add column if not exists expires_at timestamptz;

-- Update floq_participants to match floq_members structure  
alter table public.floq_participants 
add column if not exists role text default 'member';

-- Add missing policies for floq_participants (acting as floq_members)
create policy if not exists "member can read own floq membership"
on public.floq_participants
for select
using (user_id = auth.uid());

create policy if not exists "anyone can join public floq"
on public.floq_participants
for insert
with check (user_id = auth.uid());

-- ============================================================
-- 6.  HOUSEKEEPING  JOBS (update existing cleanup function)
-- ============================================================
create or replace function public.cleanup_expired_rows()
returns void
language plpgsql
as $$
begin
  delete from public.venue_live_presence where expires_at < now();
  delete from public.user_vibe_states where active = true and started_at < now() - interval '12 hours';
  -- Also clean existing tables
  delete from public.vibes_now where expires_at < now();
  delete from public.venue_feed_posts where expires_at < now();
end;
$$;

-- ============================================================
-- 7.  NICE-TO-HAVE  INDEX HINTS (optional)
-- ============================================================
-- For vibe matching queries ("people within 2 km with same vibe")
create index if not exists idx_vibe_active_loc
  on public.user_vibe_states using gist (location)
  where active = true;