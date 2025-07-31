/* ─────────────────────────────────────────────────────────────
   ❶  schema + provider catalogue
   ───────────────────────────────────────────────────────────── */
create schema if not exists integrations;

create table if not exists integrations.provider (
  id   smallserial primary key,
  name text unique not null         -- ('google', 'foursquare', …)
);

insert into integrations.provider(name)
values ('google'), ('foursquare')
on conflict do nothing;

/* ─────────────────────────────────────────────────────────────
   ❷  user-owned API keys (RLS-protected)
   ───────────────────────────────────────────────────────────── */
create table if not exists integrations.user_credential (
  id           bigserial primary key,
  user_id      uuid      not null references auth.users(id) on delete cascade,
  provider_id  smallint  not null references integrations.provider(id),
  api_key      text      not null,
  created_at   timestamptz default now(),
  unique (user_id, provider_id)
);
alter table integrations.user_credential enable row level security;
create policy "owner" on integrations.user_credential
  for all using (user_id = auth.uid());

/* ─────────────────────────────────────────────────────────────
   ❸  raw feed inbox (append-only, unlogged = fast)
   ───────────────────────────────────────────────────────────── */
create unlogged table if not exists integrations.place_feed_raw (
  id           bigserial primary key,
  user_id      uuid,
  provider_id  smallint references integrations.provider(id),
  fetched_at   timestamptz default now(),
  processed_at timestamptz,
  payload      jsonb
);
create index if not exists idx_feed_raw_unprocessed
  on integrations.place_feed_raw(processed_at) where processed_at is null;

/* ─────────────────────────────────────────────────────────────
   ❹  place-details cache  (7-day TTL via generated column)
   ───────────────────────────────────────────────────────────── */
create table if not exists public.place_details (
  place_id    text  primary key,
  data        jsonb not null,
  fetched_at  timestamptz default now(),
  profile_id  uuid references public.profiles(id),
  is_expired  boolean generated always as
               (fetched_at < (now() - interval '7 days')) stored
);
create index if not exists idx_place_details_expired
  on public.place_details(is_expired)
  where is_expired;

alter table public.place_details enable row level security;
create policy "read_any" on public.place_details
  for select using (true);
create policy "no_write"  on public.place_details
  for all    using (false)  with check (false);

/* ─────────────────────────────────────────────────────────────
   ❺  normaliser: raw → venues / visits   (idempotent)
   ───────────────────────────────────────────────────────────── */
create or replace function integrations.normalise_place_feed()
returns int language plpgsql security definer
set search_path = integrations, public as $$
declare processed int := 0;
begin
  with pending as (
    select id, user_id, provider_id, payload
      from integrations.place_feed_raw
     where processed_at is null
     order by fetched_at
     limit 200
  ), claimed as (
    update integrations.place_feed_raw
       set processed_at = now()
     where id in (select id from pending)
     returning *
  ), rows as (          -- explode provider-specific JSON
    select  c.id,
            c.user_id,
            c.provider_id,
            jsonb_path_query_first(
              c.payload,
              case c.provider_id
                when 1 then '$.results[*]'   -- Google
                when 2 then '$.results[*]'   -- FSQ Nearby
              end
            ) as item
      from  claimed c
  ), upsert_venue as (
    insert into public.venues
      (provider, provider_id, name, lat, lng, geom, categories, source)
    select
      case provider_id when 1 then 'google' else 'foursquare' end,
      coalesce(item->>'place_id', item->>'fsq_id'),
      coalesce(item->>'name',     item->>'name'),
      case provider_id
        when 1 then (item#>>'{geometry,location,lat}')::float
        else (item#>>'{geocodes,main,latitude}')::float
      end,
      case provider_id
        when 1 then (item#>>'{geometry,location,lng}')::float
        else (item#>>'{geocodes,main,longitude}')::float
      end,
      ST_SetSRID(ST_MakePoint(
        case provider_id
          when 1 then (item#>>'{geometry,location,lng}')::float
          else (item#>>'{geocodes,main,longitude}')::float
        end,
        case provider_id
          when 1 then (item#>>'{geometry,location,lat}')::float
          else (item#>>'{geocodes,main,latitude}')::float
        end
      ),4326),
      case provider_id
        when 1 then (
          select array_agg(x::text) from jsonb_array_elements_text(item->'types') x
        )
        else (
          select array_agg(x::text)
          from jsonb_array_elements(item->'categories')->>'name' x
        )
      end,
      'import'
    from rows
    where coalesce(item->>'place_id', item->>'fsq_id') is not null
    on conflict (provider, provider_id) do update
      set name       = excluded.name,
          categories = excluded.categories
    returning provider, provider_id, id
  ), visits as (
    insert into public.venue_visits(user_id, venue_id, arrived_at, distance_m)
    select r.user_id, v.id, now(), 25
      from rows r
      join upsert_venue v using (provider, provider_id)
    on conflict do nothing
  )
  select count(*) into processed from rows;
  return processed;
end $$;

/* ─────────────────────────────────────────────────────────────
   ❻  cron every two minutes (idempotent)
   ───────────────────────────────────────────────────────────── */
select cron.schedule('normalise_place_feed',
                     '*/2 * * * *',
                     $$select integrations.normalise_place_feed();$$)
on conflict (job_name) do nothing;