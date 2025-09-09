-- Drop existing function first
DROP FUNCTION IF EXISTS public.search_flow_venues_enriched(jsonb,double precision,double precision,integer,integer,boolean,boolean,integer);

-- ===================================================================
-- Single enriched venue search for Flow Explore
-- - bbox OR (center+radius) spatial filter
-- - busy_band by recent flow_segments
-- - optional friend boost (friendships table; uses auth.uid())
-- - optional "sun" boost (outdoor categories)
-- - stable sort and limit
-- ===================================================================

create or replace function public.search_flow_venues_enriched(
  bbox_geojson jsonb default null,
  center_lat   double precision default null,
  center_lng   double precision default null,
  radius_m     integer          default 1000,
  since_minutes integer         default 45,
  include_friend_boost boolean  default false,
  wants_sun     boolean         default false,
  limit_n       integer         default 200
)
returns table (
  id uuid,
  name text,
  category text,
  busy_band int
)
language sql
security definer               -- (returns only aggregates & venue id; safe)
set search_path = public, pg_temp
stable
as $$
with
params as (
  select
    greatest(50, least(5000, coalesce(radius_m,1000))) as radius_m_clamped,
    now() - make_interval(mins => greatest(1, coalesce(since_minutes,45))) as since_ts,
    include_friend_boost as friend_on,
    wants_sun as sun_on
),
-- Build a geometry for the bbox (if provided)
bbox_geom as (
  select case
    when bbox_geojson is not null then
      ST_SetSRID(ST_GeomFromGeoJSON(bbox_geojson::text), 4326)
    else null::geometry
  end as g
),
-- Center point if using radius search
ctr as (
  select case
    when center_lat is not null and center_lng is not null
      then ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326)
    else null::geometry
  end as g
),
-- All venues within spatial filter
base_venues as (
  select
    v.id,
    v.name,
    -- Pick first category (text[]) as the display category
    (case
       when v.categories is null or array_length(v.categories,1) = 0 then null
       else v.categories[1]
     end) as disp_category,
    -- robust geometry: prefer geom, fallback to lat/lng
    coalesce(v.geom, ST_SetSRID(ST_MakePoint(v.lng, v.lat), 4326)) as v_geom
  from public.venues v, params p, bbox_geom b, ctr c
  where
    (
      -- bbox filter
      (b.g is not null and ST_Intersects(coalesce(v.geom, ST_SetSRID(ST_MakePoint(v.lng, v.lat), 4326)), b.g))
      -- OR center+radius filter
      or (b.g is null and c.g is not null and ST_DWithin(
           coalesce(v.geom, ST_SetSRID(ST_MakePoint(v.lng, v.lat), 4326))::geography,
           c.g::geography,
           p.radius_m_clamped
         ))
    )
),
-- Recent segment counts per venue (last N minutes)
seg_counts as (
  select
    fs.venue_id,
    count(*)::int as seg_count
  from params p
  join public.flow_segments fs
    on fs.arrived_at >= p.since_ts
   and fs.venue_id is not null
  group by fs.venue_id
),
-- Friend venue counts (owner's friends → flows → segments)
friend_ids as (
  -- friendships.profile_high / .profile_low are user ids (auth.users).
  -- Flows.profile_id must align to the same id to treat as "friend flow".
  select
    case when f.profile_high = auth.uid() then f.profile_low else f.profile_high end as friend_id
  from public.friendships f
  where f.friend_state = 'accepted'
    and (f.profile_high = auth.uid() or f.profile_low = auth.uid())
),
friend_seg_counts as (
  select
    fs.venue_id,
    count(*)::int as friend_count
  from params p
  join public.flows fl on fl.started_at >= p.since_ts
  join friend_ids fid on fl.profile_id = fid.friend_id
  join public.flow_segments fs
    on fs.flow_id = fl.id
   and fs.arrived_at >= p.since_ts
   and fs.venue_id is not null
  group by fs.venue_id
),
-- Final scoring + sorting
scored as (
  select
    bv.id,
    bv.name,
    bv.disp_category as category,
    -- Busy band thresholds: 0,1,2(<=3),3(<=6),4(>6)
    case
      when coalesce(sc.seg_count,0) = 0 then 0
      when sc.seg_count = 1 then 1
      when sc.seg_count <= 3 then 2
      when sc.seg_count <= 6 then 3
      else 4
    end as busy_band,
    -- friend boost (stable)
    coalesce(fsc.friend_count, 0) as friend_cnt,
    -- sun/outdoor score (very light heuristic on categories)
    case when (select sun_on from params)
      then (
        -- match against common outdoor keywords on first category
        (case when lower(coalesce(bv.disp_category,'')) like any (array[
            '%patio%','%beer garden%','%rooftop%','%outdoor%','%park%','%beach%'
          ]) then 2 else 0 end)
        -- nudge by busy band a bit to avoid empty places
        + (case
             when coalesce(sc.seg_count,0)=0 then 0
             when sc.seg_count = 1 then 1
             when sc.seg_count <= 3 then 2
             when sc.seg_count <= 6 then 3
             else 4
           end) * 0.1
      )::numeric
      else 0::numeric
    end as sun_score
  from base_venues bv
  left join seg_counts sc
    on sc.venue_id = bv.id
  left join friend_seg_counts fsc
    on fsc.venue_id = bv.id
),
ordered as (
  select *
  from scored s, params p
  order by
    -- Friend boost primary (if enabled)
    case when p.friend_on then s.friend_cnt else 0 end desc,
    -- Busy band next
    s.busy_band desc,
    -- Sun score (if wants_sun)
    s.sun_score desc,
    -- Stable tiebreaker
    s.name asc
  limit coalesce(limit_n, 200)
)
select id, name, category, busy_band
from ordered;
$$;

-- Recommended grants (adjust to your roles)
grant execute on function public.search_flow_venues_enriched(
  jsonb, double precision, double precision, integer,
  integer, boolean, boolean, integer
) to authenticated, anon;

-- Performance indexes
-- Speeds up spatial filters when venues.geom is used
create index if not exists venues_geom_gist on public.venues using gist (geom);

-- Helps friend boost and busy counts windows
create index if not exists flow_segments_venue_time on public.flow_segments (venue_id, arrived_at desc);
create index if not exists flows_profile_started on public.flows (profile_id, started_at desc);