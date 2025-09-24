/*****************************************************************
  2025-08-01  Core tables for Favourites / Watch-list / Venues-near-me
******************************************************************/

-- ───────────────────────────  user_favorites  ────────────────────────────
create table if not exists public.user_favorites (
  user_id    uuid not null references auth.users(id) on delete cascade,
  item_id    uuid not null,
  item_type  text not null check (item_type in ('venue','plan')),
  created_at timestamptz not null default now(),

  title       text,
  description text,
  image_url   text,

  primary key (user_id,item_id,item_type)
);

alter table public.user_favorites enable row level security;
create policy fav_owner_all on public.user_favorites
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ───────────────────────────  user_watchlist  ────────────────────────────
create table if not exists public.user_watchlist (
  user_id    uuid not null references auth.users(id) on delete cascade,
  plan_id    uuid not null references public.floq_plans(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id,plan_id)
);

alter table public.user_watchlist enable row level security;
create policy wl_owner on public.user_watchlist
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ───────────────────────────  venues_near_me  ────────────────────────────
create table if not exists public.venues_near_me (
  user_id      uuid    not null references auth.users(id)    on delete cascade,
  venue_id     uuid    not null references public.venues(id) on delete cascade,
  distance_m   numeric not null,
  name         text    not null,
  category     text,
  lat          numeric not null,
  lng          numeric not null,
  vibe_score   numeric not null default 0.5,
  last_updated timestamptz not null default now(),
  primary key (user_id,venue_id)
);

create index if not exists idx_vnm_user_latlng on public.venues_near_me(user_id,lat,lng);

alter table public.venues_near_me enable row level security;
create policy vnm_owner_select on public.venues_near_me
  for select using (auth.uid() = user_id);