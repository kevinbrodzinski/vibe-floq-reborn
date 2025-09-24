-- MATERIALIZED VIEW, refreshable by cron if you like (fix geometry casting)
create materialized view if not exists v_friend_sparkline as
select user_id,
       (   select json_agg(json_build_array(
                     round(st_y(geom::geometry)::numeric,6),
                     round(st_x(geom::geometry)::numeric,6)
               ) order by captured_at desc)
           from (
             select geom
             from raw_locations
             where user_id = rl.user_id
               and captured_at >= now() - interval '24 hours'
             order by captured_at desc
             limit 20
           ) t
       ) as points
from raw_locations rl
group by user_id;

-- quick RLS
alter table v_friend_sparkline enable row level security;
create policy "own_rows" on v_friend_sparkline for select using (true);

-- Incognito timer alteration
alter table friend_share_pref
  add column if not exists ends_at timestamptz;

create or replace function is_live_now(uid uuid)
returns boolean language sql stable as $$
  select case
           when not is_live then false
           when ends_at is null then true
           else now() < ends_at
         end
  from friend_share_pref
  where user_id = uid;
$$;

-- Encounter heat-map view (fix geometry casting)
create or replace view v_encounter_heat as
select venue_id,
       count(*)              as hits,
       max(first_seen)       as last_seen,
       v.geom
from user_encounter ue
join venues v on v.id = ue.venue_id
where user_a = auth.uid() or user_b = auth.uid()
group by venue_id, v.geom;

alter view v_encounter_heat enable row level security;
create policy "self" on v_encounter_heat for select using (true);