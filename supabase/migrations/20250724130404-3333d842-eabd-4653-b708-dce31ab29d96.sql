-- ❶ VENUE_STAYS table (if you skipped the earlier slice)
create table if not exists public.venue_stays (
  id            bigserial primary key,
  user_id       uuid        not null,
  venue_id      uuid        not null references public.venues(id),
  arrived_at    timestamptz not null,
  departed_at   timestamptz,
  plan_id       uuid,                       -- nullable (auto-filled trigger)
  stop_id       uuid,                       -- nullable
  constraint uniq_stay unique (user_id, venue_id, arrived_at)
);

-- ❷ trigger: hook a stay into the current plan stop + check-in + notify
create or replace function public.tg_checkin_on_stay_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _stop  plan_stops%rowtype;
  _check uuid;
begin
  /* link the stay to its plan stop (venue + same local day) */
  select ps.* into _stop
  from   plan_stops ps
  where  ps.venue_id      = new.venue_id
    and  ps.start_time::date = new.arrived_at::date
    and  ps.plan_id in (          -- only plans the user is on
          select plan_id
          from   plan_participants
          where  user_id = new.user_id)
  limit 1;

  if found then
    new.plan_id := _stop.plan_id;
    new.stop_id := _stop.id;

    insert into plan_check_ins(plan_id, stop_id, user_id, checked_in_at)
    values (_stop.plan_id, _stop.id, new.user_id, new.arrived_at)
    on conflict do nothing;      -- idempotent

    perform pg_notify(
      'plan_checkin_ready',
      json_build_object(
        'plan_id', _stop.plan_id,
        'stop_id', _stop.id,
        'user_id', new.user_id,
        'arrived_at', new.arrived_at
      )::text
    );
  end if;

  /* broadcast to stop-list listener */
  perform pg_notify(
    'venue_stays_channel',
    json_build_object(
      'type',       'stay_insert',
      'id',         new.id,
      'user_id',    new.user_id,
      'venue_id',   new.venue_id,
      'arrived_at', new.arrived_at,
      'plan_id',    new.plan_id,
      'stop_id',    new.stop_id
    )::text
  );
  return new;
end;
$$;

create trigger trg_stay_ai
  after insert on public.venue_stays
  for each row execute procedure public.tg_checkin_on_stay_insert();

-- ❸ broadcast DEPARTURE updates
create or replace function public.tg_stay_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.departed_at is not null and old.departed_at is null then
    perform pg_notify(
      'venue_stays_channel',
      json_build_object(
        'type',        'stay_depart',
        'id',          new.id,
        'user_id',     new.user_id,
        'venue_id',    new.venue_id,
        'departed_at', new.departed_at,
        'plan_id',     new.plan_id,
        'stop_id',     new.stop_id
      )::text
    );
  end if;
  return new;
end;
$$;

create trigger trg_stay_au
  after update on public.venue_stays
  for each row execute procedure public.tg_stay_update();

-- ❹ LAST-SEEN helper view
create or replace view public.v_friend_last_seen as
select user_id,
       captured_at           as last_seen_at,
       now() - captured_at   as age
from   (
  select distinct on (user_id)
         user_id, captured_at
  from   raw_locations
  order  by user_id, captured_at desc
) sub;

grant select on public.v_friend_last_seen to authenticated;