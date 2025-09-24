-- ─────────────────────────────────────────────────────────────
-- 1.  FIELD_TILES TABLE  ─ clean single-row-per-tile store
-- ─────────────────────────────────────────────────────────────
create table if not exists public.field_tiles (
  -- 6-character geohash (≈ 1.2 × 0.6 km tile) – PK keeps table small
  tile_id          text primary key,

  -- live crowd size in this tile (15-min window)
  crowd_count      integer           not null default 0,

  /*  aggregated mood colour
      {
        "h": 0-1   -- hue (circular mean)
        "s": 0-1   -- saturation
        "l": 0-1   -- lightness
      }                                               */
  avg_vibe         jsonb             not null default '{"h":0,"s":0,"l":0}',

  /*  active public Floqs whose members are inside this tile.
      Keep as UUID[] so you can JOIN to floqs(id) quickly.        */
  active_floq_ids  uuid[]            not null default '{}',

  updated_at       timestamptz       not null default now()
);

-- fast look-ups for map refresh & mobile viewport sweeps
create index if not exists field_tiles_updated_idx
  on public.field_tiles (updated_at desc);

-- ─────────────────────────────────────────────────────────────
-- 2.  VIBES_NOW TABLE  ─ minimal additions if not present
-- ─────────────────────────────────────────────────────────────
-- Only shown for reference – create these columns if missing.
alter table public.vibes_now
  add column if not exists geohash6 text,
  add column if not exists vibe text,
  add column if not exists updated_at timestamptz default now();

create index if not exists vibes_now_geohash6_updated_idx
  on public.vibes_now (geohash6, updated_at desc);

-- ─────────────────────────────────────────────────────────────
-- 3.  REFRESH FUNCTION  ─ writes aggregated rows
-- ─────────────────────────────────────────────────────────────
create or replace function public.refresh_field_tiles ()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.field_tiles as ft
        (tile_id,
         crowd_count,
         avg_vibe,
         active_floq_ids,
         updated_at)
  with live as (
      select
        geohash6,
        /* numeric hue degrees per vibe  */
        case vibe
          when 'chill'    then 198
          when 'hype'     then  29
          when 'social'   then 270
          when 'curious'  then  90
          when 'flowing'  then 162
          else 180
        end                                        as hue_deg,
        user_id,
        updated_at
      from   public.vibes_now
      where  updated_at > now() - interval '15 minutes'
        and  geohash6 is not null
  ), aggregates as (
      select
        geohash6                                          as tile,
        count(*)                                          as crowd,
        -- circular mean of hue 0-360 → 0-1, fixed type casting
        (mod((atan2(avg(sin(radians(hue_deg))),
                   avg(cos(radians(hue_deg))))*180/pi() + 360)::numeric, 360::numeric) / 360)::double precision
                                                        as hue_norm
      from   live
      group  by geohash6
  ), floqs_per_tile as (
      select
        l.geohash6                                as tile,
        array_agg(distinct fp.floq_id)            as floqs
      from   live  l
      left   join public.floq_participants fp on fp.user_id = l.user_id
      left   join public.floqs f on f.id = fp.floq_id
                                and f.deleted_at is null
                                and f.ends_at    > now()
      group  by l.geohash6
  )
  select
    a.tile                           as tile_id,
    a.crowd                          as crowd_count,
    jsonb_build_object('h', a.hue_norm, 's', 0.7, 'l', 0.6)  as avg_vibe,
    coalesce(f.floqs, '{}')          as active_floq_ids,
    now()                            as updated_at
  from aggregates a
  left join floqs_per_tile f on f.tile = a.tile
  on conflict (tile_id) do update
     set crowd_count      = excluded.crowd_count,
         avg_vibe         = excluded.avg_vibe,
         active_floq_ids  = excluded.active_floq_ids,
         updated_at       = excluded.updated_at;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- 4.  SCHEDULE  ─ run every 5 s (Supabase scheduler)
-- ─────────────────────────────────────────────────────────────
-- already present in your project; if not:
-- select cron.schedule('*/5 * * * * *', $$select public.refresh_field_tiles();$$);

-- ─────────────────────────────────────────────────────────────
-- 5.  INITIAL SEED  ─ populate right away
-- ─────────────────────────────────────────────────────────────
select public.refresh_field_tiles();