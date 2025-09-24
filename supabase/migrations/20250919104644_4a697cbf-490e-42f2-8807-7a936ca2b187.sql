-- PostGIS index for distance queries
create index if not exists idx_rallies_center_gist
  on public.rallies using gist ((center::geography));

-- Friends' FIELD rallies within radius_m meters of (lat,lng)
create or replace function public.rallies_field_nearby(
  lat double precision,
  lng double precision,
  radius_m integer default 4000
)
returns table(
  id uuid,
  creator_id uuid,
  created_at timestamptz,
  expires_at timestamptz,
  status text,
  venue_id uuid,
  scope public.rally_scope,
  note text
) language sql stable as $$
  with viewer as (
    select st_setsrid(st_makepoint(lng, lat), 4326)::geography as point
  ),
  my_friends as (
    select case when f.profile_low = auth.uid() then f.profile_high else f.profile_low end as friend_id
    from public.friendships f
    where f.friend_state='accepted'
      and (f.profile_low = auth.uid() or f.profile_high = auth.uid())
  )
  select r.id, r.creator_id, r.created_at, r.expires_at, r.status, r.venue_id, r.scope, r.note
  from public.rallies r
  join my_friends mf on mf.friend_id = r.creator_id
  join viewer v on true
  where r.status='active' and r.scope='field'
    and st_dwithin(r.center::geography, v.point, radius_m)
  order by r.expires_at desc
  limit 100;
$$;

-- Wings Poll system tables if not already present
create table if not exists public.floq_wings_events (
  id uuid primary key default gen_random_uuid(),
  floq_id uuid not null references public.floqs(id) on delete cascade,
  kind text not null check (kind in ('poll','time_picker','meet_halfway','venue_suggestion','reminder','recap')),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid null references public.profiles(id),
  confidence numeric(3,2) null,
  status text not null default 'active' check (status in ('active','dismissed','expired'))
);

create table if not exists public.floq_wings_votes (
  event_id uuid not null references public.floq_wings_events(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  option_idx int not null,
  created_at timestamptz not null default now(),
  primary key (event_id, profile_id)
);

-- Enable RLS
alter table public.floq_wings_events enable row level security;
alter table public.floq_wings_votes enable row level security;

-- Drop existing policies if they exist, then create new ones
drop policy if exists wings_read on public.floq_wings_events;
drop policy if exists wings_vote on public.floq_wings_votes;

create policy wings_read on public.floq_wings_events
for select using (
  exists(select 1 from public.floq_participants fp
         where fp.floq_id = floq_wings_events.floq_id
           and fp.profile_id = auth.uid())
);

create policy wings_vote on public.floq_wings_votes
for insert with check (
  exists(select 1
         from public.floq_wings_events e
         join public.floq_participants fp
           on fp.floq_id = e.floq_id and fp.profile_id = auth.uid()
         where e.id = floq_wings_votes.event_id)
);

-- Wings poll tally function
create or replace function public.wings_poll_tally(p_event_id uuid)
returns table(option_idx int, votes int) language sql stable as $$
  select option_idx, count(*)::int
  from public.floq_wings_votes
  where event_id = p_event_id
  group by option_idx
  order by option_idx;
$$;