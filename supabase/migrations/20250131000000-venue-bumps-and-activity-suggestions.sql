-- ▸ venue_bumps : one row per (profile,venue)  ──👍 "Bump" feature
create table if not exists venue_bumps (
  venue_id   text  not null,
  profile_id uuid  not null references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (venue_id, profile_id)
);

-- Row-level security
alter table venue_bumps enable row level security;
create policy "bump self-write"  on venue_bumps for insert with check (auth.uid() = profile_id);
create policy "bump self-delete" on venue_bumps for delete using   (auth.uid() = profile_id);
create policy "public read"      on venue_bumps for select using (true);

-- Stream bumps
alter publication supabase_realtime add table venue_bumps;

-- ▸ v_friend_visits : fast "how many of MY friends went here"
create materialized view if not exists v_friend_visits as
with visits as (
  select vs.venue_id,
         least(f.user_low,f.user_high)  as p_low,
         greatest(f.user_low,f.user_high) as p_high
  from venue_stays vs
  join friendships f
    on (vs.profile_id = f.user_low  and f.user_high = vs.profile_id)
    or (vs.profile_id = f.user_high and f.user_low  = vs.profile_id)
  where f.friend_state = 'accepted'
)
select venue_id,
       jsonb_agg(distinct p_low||','||p_high) as friend_pairs
from visits
group by venue_id;

create index if not exists idx_v_friend_visits_venue on v_friend_visits(venue_id);

-- auto-refresh every 5 min
select cron.schedule('refresh-friend-visits','*/5 * * * *',
  $$ refresh materialized view concurrently v_friend_visits $$);

-- ▸ get_friend_visit_stats(viewer, venue)  → (#friends, list[id])
create or replace function get_friend_visit_stats(
  p_viewer uuid,
  p_venue  text
)
returns table(friend_count int, friend_list jsonb)
language sql stable as $$
select
  coalesce(jsonb_array_length(friend_pairs),0) as friend_count,
  coalesce(friend_pairs,'[]'::jsonb)           as friend_list
from v_friend_visits
where venue_id = p_venue;
$$;

-- ▸ toggle_venue_bump(venue)  → new bump_count
create or replace function toggle_venue_bump(p_venue text)
returns int
language plpgsql security definer as $$
declare bumps int;
begin
  if exists(select 1 from venue_bumps where venue_id=p_venue and profile_id=auth.uid()) then
    delete from venue_bumps where venue_id=p_venue and profile_id=auth.uid();
  else
    insert into venue_bumps(venue_id,profile_id) values(p_venue,auth.uid());
  end if;
  select count(*) into bumps from venue_bumps where venue_id=p_venue;
  return bumps;
end;
$$;