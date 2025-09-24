-- ----------  EXTENSIONS  ----------
create extension if not exists postgis;

-- ----------  PING REQUESTS ----------
create table if not exists public.ping_requests (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null,
  target_id    uuid not null,
  requested_at timestamptz not null default now(),
  status       text not null check (status in ('pending','accepted','declined')),
  responded_at timestamptz,
  constraint ping_no_self check (requester_id <> target_id)
);

-- one pending row per pair
create unique index if not exists ping_unique_pending_idx2
  on public.ping_requests(requester_id,target_id)
  where status = 'pending';

create index if not exists ping_requests_target_idx   on public.ping_requests(target_id);
create index if not exists ping_requests_requester_idx on public.ping_requests(requester_id);
create index if not exists ping_pending_idx
  on public.ping_requests(target_id)
  where status = 'pending';

-- ----------  SHARED LOCATION PINS ----------
create table if not exists public.shared_location_pins (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null,
  viewer_id  uuid not null,
  geom       geography(point,4326) not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint pin_expiry_window check (expires_at < now() + interval '7 days')
);

create index if not exists shared_pins_viewer_owner_idx
  on public.shared_location_pins(viewer_id, owner_id)
  where expires_at > now();

create index if not exists shared_pins_expire_idx on public.shared_location_pins(expires_at);

alter table public.shared_location_pins
  set (autovacuum_vacuum_scale_factor = 0.05);

-- ----------  FRIEND-PRESENCE VIEW ----------
drop view if exists public.friend_presence cascade;

create view public.friend_presence
with (security_barrier = true)
as
/*  caller (me)  |   friend   */
select
  f.user_id   as me,
  f.friend_id as friend,
  u.location,
  u.vibe_tag,
  u.started_at
from public.friendships f
join public.user_vibe_states u on u.user_id = f.friend_id
where f.status = 'accepted'
  and u.active
  and u.started_at > now() - interval '90 min'

union all

select
  f.friend_id as me,
  f.user_id   as friend,
  u.location,
  u.vibe_tag,
  u.started_at
from public.friendships f
join public.user_vibe_states u on u.user_id = f.user_id
where f.status = 'accepted'
  and u.active
  and u.started_at > now() - interval '90 min';

-- ----------  SPATIAL INDEX ----------
create index if not exists user_vibe_states_loc_gix
  on public.user_vibe_states using gist(location)
  where active = true;

-- ----------  SOCIAL-SUGGESTIONS RPC ----------
create or replace function public.get_social_suggestions(
  me uuid,
  max_dist_m integer default 1000,
  limit_n   integer default 5
)
returns table (
  friend_id   uuid,
  display_name text,
  avatar_url   text,
  vibe_tag     vibe_enum,
  vibe_match   real,
  distance_m   real,
  started_at   timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  set local enable_seqscan = off;

  return query
  select
    fp.friend,
    p.display_name,
    p.avatar_url,
    fp.vibe_tag,
    coalesce(vibe_similarity(my.vibe_tag, fp.vibe_tag),0) as vibe_match,
    st_distancesphere(fp.location, my.location)           as distance_m,
    fp.started_at
  from friend_presence fp
  join profiles p on p.id = fp.friend
  join lateral (
    select v.location, v.vibe_tag
    from user_vibe_states v
    where v.user_id = me
      and v.active
    limit 1
  ) my on true
  where fp.me = me
    and st_distancesphere(fp.location, my.location) <= max_dist_m
  order by vibe_match desc, distance_m asc, fp.started_at desc
  limit limit_n;
end;
$$;

grant execute on function public.get_social_suggestions(uuid,integer,integer) to authenticated;

-- ----------  RLS ----------
alter table public.ping_requests          enable row level security;
alter table public.shared_location_pins   enable row level security;

-- ping policies
drop policy if exists ping_read_own_or_target on public.ping_requests;
create policy ping_read_own_or_target
  on public.ping_requests
  for select
  using (auth.uid() in (requester_id, target_id));

drop policy if exists ping_insert_self_requester on public.ping_requests;
create policy ping_insert_self_requester
  on public.ping_requests
  for insert
  with check (requester_id = auth.uid());

drop policy if exists ping_update_target_only on public.ping_requests;
create policy ping_update_target_only
  on public.ping_requests
  for update
  using (target_id = auth.uid());

drop policy if exists ping_update_requester_cancel on public.ping_requests;
create policy ping_update_requester_cancel
  on public.ping_requests
  for update
  using (requester_id = auth.uid() and status = 'pending');

-- pin policies
drop policy if exists pin_viewer_can_see on public.shared_location_pins;
create policy pin_viewer_can_see
  on public.shared_location_pins
  for select
  using (viewer_id = auth.uid());

drop policy if exists pin_owner_insert on public.shared_location_pins;
create policy pin_owner_insert
  on public.shared_location_pins
  for insert
  with check (owner_id = auth.uid());

drop policy if exists pin_owner_delete on public.shared_location_pins;
create policy pin_owner_delete
  on public.shared_location_pins
  for delete
  using (owner_id = auth.uid());

-- ----------  FK CONSTRAINTS (not-valid first) ----------
alter table public.ping_requests
  add constraint ping_requester_fk
  foreign key (requester_id) references auth.users(id) on delete cascade not valid,
  add constraint ping_target_fk
  foreign key (target_id)    references auth.users(id) on delete cascade not valid;

alter table public.shared_location_pins
  add constraint pins_owner_fk
  foreign key (owner_id)  references auth.users(id) on delete cascade not valid,
  add constraint pins_viewer_fk
  foreign key (viewer_id) references auth.users(id) on delete cascade not valid;

-- validate later when old rows are cleaned up
-- alter table ... validate constraint pins_owner_fk;

-- ----------  CRON CLEAN-UP (idempotent) ----------
do $$
begin
  if not exists (select 1 from cron.job where jobname = 'prune_shared_pins') then
    perform cron.schedule(
      'prune_shared_pins',
      '0 * * * *',
      $$delete from public.shared_location_pins where expires_at < now();$$
    );
  end if;
end$$;