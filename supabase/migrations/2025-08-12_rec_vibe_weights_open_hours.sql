-- 2025-08-12_rec_vibe_weights_open_hours.sql
begin;

-- Ensure extensions
create extension if not exists postgis;
create extension if not exists vector;

-- 1) Vibe-weight tables
create table if not exists public.rec_vibe_weights (
  vibe text primary key,
  w_distance  numeric not null default 0.25,
  w_rating    numeric not null default 0.20,
  w_popularity numeric not null default 0.20,
  w_tag_match numeric not null default 0.15,
  w_cuisine_match numeric not null default 0.10,
  w_price_fit numeric not null default 0.10,
  updated_at timestamptz not null default now()
);

create table if not exists public.rec_user_vibe_weights (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  vibe text not null,
  weights jsonb not null,                  -- { "w_distance":0.2, ... }
  updated_at timestamptz not null default now(),
  primary key (profile_id, vibe)
);

-- Seed defaults (safe upsert; include 'default' fallback)
insert into public.rec_vibe_weights (vibe,w_distance,w_rating,w_popularity,w_tag_match,w_cuisine_match,w_price_fit)
values
  ('default',0.25,0.20,0.20,0.15,0.10,0.10),
  ('relax',  0.22,0.26,0.12,0.22,0.10,0.08),
  ('hype',   0.12,0.16,0.34,0.26,0.04,0.08),
  ('date',   0.15,0.30,0.12,0.28,0.05,0.10),
  ('work',   0.32,0.16,0.10,0.20,0.05,0.17)
on conflict (vibe) do update set
  w_distance=excluded.w_distance,
  w_rating=excluded.w_rating,
  w_popularity=excluded.w_popularity,
  w_tag_match=excluded.w_tag_match,
  w_cuisine_match=excluded.w_cuisine_match,
  w_price_fit=excluded.w_price_fit,
  updated_at=now();

-- 2) Open-hours function supporting Google "periods" and per-day arrays with overnight
create or replace function public.is_open_at(hours jsonb, tz text, ts timestamptz)
returns boolean
language plpgsql stable as $$
declare
  local_ts timestamp := ts at time zone tz;
  dow int := extract(dow from local_ts);             -- 0=Sun..6=Sat
  hhmi text := to_char(local_ts, 'HH24MI');          -- '2130'
  day_keys text[] := array['sun','mon','tue','wed','thu','fri','sat'];
  key text := day_keys[dow+1];
  prev_key text := day_keys[(dow+6)%7+1];
  elem jsonb;
  start_txt text; end_txt text;
  open_day int; close_day int; open_time text; close_time text;
begin
  if hours is null then return false; end if;

  -- Google 'periods': [{"open":{"day":1,"time":"1100"},"close":{"day":1,"time":"2200"}}]
  if hours ? 'periods' then
    for elem in select * from jsonb_array_elements(hours->'periods') loop
      open_day := (elem->'open'->>'day')::int;
      open_time := coalesce(elem->'open'->>'time','0000');
      close_day := nullif(elem->'close'->>'day','')::int;
      close_time := coalesce(elem->'close'->>'time','2400');

      -- same-day
      if open_day = dow and (close_day is null or close_day = dow)
         and open_time <= hhmi and hhmi < close_time then
        return true;
      end if;

      -- overnight prev->current
      if close_day is not null and open_day = (dow+6)%7 and close_day = dow
         and hhmi < close_time then
        return true;
      end if;

      -- overnight current->next
      if open_day = dow and close_day is not null and close_day = (dow+1)%7
         and open_time <= hhmi then
        return true;
      end if;
    end loop;
    return false;
  end if;

  -- Custom {"mon":[["11:00","22:00"],["23:00","02:00"]], ...}
  for elem in select * from jsonb_array_elements(coalesce(hours->key, '[]'::jsonb)) loop
    start_txt := replace(elem->>0, ':','');
    end_txt   := replace(elem->>1, ':','');

    -- normal same-day
    if end_txt >= start_txt and start_txt <= hhmi and hhmi < end_txt then
      return true;
    end if;

    -- overnight current->next (e.g., 20:00-02:00)
    if end_txt < start_txt and start_txt <= hhmi then
      return true;
    end if;
  end loop;

  -- spill from previous day overnight
  for elem in select * from jsonb_array_elements(coalesce(hours->prev_key, '[]'::jsonb)) loop
    start_txt := replace(elem->>0, ':','');
    end_txt   := replace(elem->>1, ':','');
    if end_txt < start_txt and hhmi < end_txt then
      return true;
    end if;
  end loop;

  return false;
end$$;

-- 3) Recommendation Events: add A/B bucket if missing
alter table if exists public.recommendation_events
  add column if not exists ab_bucket text;

-- If recommendation_events doesn't exist, create it
create table if not exists public.recommendation_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  context jsonb not null,             -- {lat,lng,vibe,hour,party_size,tags}
  candidate_ids uuid[] not null,
  scores numeric[] not null,
  top_ids uuid[] not null,
  ab_bucket text,
  created_at timestamptz not null default now()
);

-- 4) User tastes table if not exists
create table if not exists public.user_tastes (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  preferred_cuisines text[] default '{}',
  disliked_cuisines  text[] default '{}',
  preferred_tags     text[] default '{}',
  disliked_tags      text[] default '{}',
  dietary            text[] default '{}',     -- vegan, halal, gluten-free
  vibe_preference    text[] default '{}',     -- chill, hype, live-music, date
  price_min int, price_max int,
  distance_max_m int default 3000,
  open_now_only boolean default true,
  updated_at timestamptz default now()
);

-- 5) Venue interactions table if not exists
create table if not exists public.venue_interactions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  venue_id uuid not null references public.venues(id) on delete cascade,
  interaction_type text not null check (interaction_type in
    ('view','tap','bookmark','checkin','plan','share','dismiss','like','dislike','rating')),
  weight numeric not null default 0.0, -- +1 like, -1 dislike, etc.
  context jsonb default '{}',          -- {vibe, hour, party_size, surface}
  created_at timestamptz not null default now()
);

-- 6) Updated RPC: vibe-weighted scoring + open-hours + optional A/B logging
drop function if exists public.get_personalized_recs(uuid,double precision,double precision,int,timestamptz,text,text[],int);
drop function if exists public.get_personalized_recs(uuid,double precision,double precision,int,timestamptz,text,text[],text,int);

create or replace function public.get_personalized_recs(
  p_profile_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_radius_m int default 3000,
  p_now timestamptz default now(),
  p_vibe text default null,
  p_tags text[] default null,
  p_tz text default 'America/Los_Angeles',
  p_limit int default 20,
  p_ab text default null,           -- optional A/B label, logged if provided
  p_log boolean default true        -- toggle logging
)
returns table(venue_id uuid, name text, dist_m int, score numeric, reason text)
language plpgsql as $$
declare
  pt geography := st_setsrid(st_makepoint(p_lng, p_lat),4326)::geography;
begin
  return query
  with tastes as (
    select * from public.user_tastes where profile_id = p_profile_id
  ),
  -- weights: per-user override -> vibe row -> default row
  w as (
    select
      coalesce((uw.weights->>'w_distance')::numeric,  vw.w_distance,  dv.w_distance)  as w_distance,
      coalesce((uw.weights->>'w_rating')::numeric,    vw.w_rating,    dv.w_rating)    as w_rating,
      coalesce((uw.weights->>'w_popularity')::numeric,vw.w_popularity,dv.w_popularity)as w_popularity,
      coalesce((uw.weights->>'w_tag_match')::numeric, vw.w_tag_match, dv.w_tag_match) as w_tag_match,
      coalesce((uw.weights->>'w_cuisine_match')::numeric,vw.w_cuisine_match,dv.w_cuisine_match) as w_cuisine_match,
      coalesce((uw.weights->>'w_price_fit')::numeric, vw.w_price_fit, dv.w_price_fit) as w_price_fit
    from (select * from public.rec_vibe_weights where vibe = coalesce(p_vibe,'default')) vw
    full join (select * from public.rec_vibe_weights where vibe = 'default') dv on true
    left join public.rec_user_vibe_weights uw
      on uw.vibe = coalesce(p_vibe,'default') and uw.profile_id = p_profile_id
    limit 1
  ),
  ctx as (
    select coalesce((select preferred_tags     from tastes), '{}') pref_tags,
           coalesce((select disliked_tags      from tastes), '{}') bad_tags,
           coalesce((select preferred_cuisines from tastes), '{}') pref_cuisines,
           coalesce((select disliked_cuisines  from tastes), '{}') bad_cuisines,
           coalesce((select price_min from tastes), null) pmin,
           coalesce((select price_max from tastes), null) pmax,
           coalesce((select open_now_only from tastes), true) open_only
  ),
  base as (
    select v.id, v.name,
           cast(st_distance(v.geom::geography, pt) as int) dist_m,
           v.categories, v.price_tier, v.rating, v.popularity
    from public.venues v
    where v.geom is not null
      and st_dwithin(v.geom::geography, pt, p_radius_m)
      and (p_tags is null or v.categories && p_tags)
  ),
  filtered as (
    select b.*
    from base b, ctx
    where (ctx.pmin is null or (b.price_tier = '$' and ctx.pmin <= 1) or 
           (b.price_tier = '$$' and ctx.pmin <= 2) or
           (b.price_tier = '$$$' and ctx.pmin <= 3) or
           (b.price_tier = '$$$$' and ctx.pmin <= 4))
      and (ctx.pmax is null or (b.price_tier = '$' and ctx.pmax >= 1) or 
           (b.price_tier = '$$' and ctx.pmax >= 2) or
           (b.price_tier = '$$$' and ctx.pmax >= 3) or
           (b.price_tier = '$$$$' and ctx.pmax >= 4))
  ),
  scored as (
    select
      f.id as venue_id,
      f.name,
      f.dist_m,
      -- components
      (1 - least(f.dist_m::numeric / greatest(p_radius_m,1), 1)) as c_distance,
      coalesce((f.rating/5.0), 0)                                as c_rating,
      coalesce((f.popularity::numeric / 100.0), 0)               as c_popularity,
      case when p_vibe is not null and f.categories @> array[p_vibe] then 1 else 0 end as c_tag_match,
      case when exists (select 1 from ctx where f.categories && ctx.pref_cuisines) then 1 else 0 end as c_cuisine_match,
      case when f.price_tier is not null then 1 else 0 end as c_price_fit
    from filtered f
  ),
  final as (
    select
      s.venue_id, s.name, s.dist_m,
      s.c_distance   * (select w_distance   from w) +
      s.c_rating     * (select w_rating     from w) +
      s.c_popularity * (select w_popularity from w) +
      s.c_tag_match  * (select w_tag_match  from w) +
      s.c_cuisine_match * (select w_cuisine_match from w) +
      s.c_price_fit  * (select w_price_fit  from w)     as score,
      concat_ws(' · ',
        (case when p_vibe is not null and s.c_tag_match=1 then 'Matches vibe' end),
        (case when s.dist_m <= 800 then 'Walkable' end),
        (case when s.c_rating >= 0.9 then 'Top rated' end),
        (case when s.c_popularity >= 0.7 then 'Popular now' end),
        (case when s.c_price_fit=1 then 'In budget' end)
      ) as reason
    from scored s
    order by score desc, dist_m asc
    limit p_limit
  )
  select * from final;

  -- Optional logging
  if p_log then
    insert into public.recommendation_events (profile_id, context, candidate_ids, scores, top_ids, ab_bucket)
    select
      p_profile_id,
      jsonb_build_object(
        'lat', p_lat, 'lng', p_lng, 'radius_m', p_radius_m,
        'now', p_now, 'tz', p_tz, 'vibe', p_vibe, 'tags', p_tags
      ),
      (select array_agg(venue_id order by score desc) from final),
      (select array_agg(score order by score desc)    from final),
      (select array_agg(venue_id order by score desc) from final),
      p_ab;
  end if;
end;
$$;

-- 7) RLS (owner-only) for new tables
alter table public.rec_user_vibe_weights enable row level security;
create policy if not exists "own vibe weights"
on public.rec_user_vibe_weights
for all
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

-- (rec_vibe_weights is global read-only)
alter table public.rec_vibe_weights enable row level security;
create policy if not exists "read all"
on public.rec_vibe_weights for select using (true);

-- user_tastes RLS
alter table public.user_tastes enable row level security;
create policy if not exists "own tastes"
on public.user_tastes for all
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

-- venue_interactions RLS
alter table public.venue_interactions enable row level security;
create policy if not exists "own interactions"
on public.venue_interactions for all
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

-- recommendation_events already exists; ensure owner-only policy
alter table public.recommendation_events enable row level security;
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='recommendation_events'
      and policyname='own rec events'
  ) then
    create policy "own rec events"
    on public.recommendation_events for all
    using (profile_id = auth.uid())
    with check (profile_id = auth.uid());
  end if;
end$$;

commit;