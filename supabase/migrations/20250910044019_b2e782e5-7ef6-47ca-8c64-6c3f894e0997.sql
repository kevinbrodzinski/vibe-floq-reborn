-- 1) Add reflection fields to flows (non-breaking)
alter table public.flows
  add column if not exists reflection_generated_at timestamptz,
  add column if not exists insights jsonb,
  add column if not exists postcard_url text,
  add column if not exists share_count integer default 0;

-- Optional analytics table
create table if not exists public.flow_reflections (
  flow_id uuid references public.flows(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  shared_to text,      -- 'story' | 'ripple' | 'postcard' | ...
  engagement jsonb
);

-- Enable RLS on flow_reflections
alter table public.flow_reflections enable row level security;

-- Policy: users can view their own flow reflections
create policy "Users can view their own flow reflections"
  on public.flow_reflections for select
  using (
    exists (
      select 1 from public.flows f 
      where f.id = flow_reflections.flow_id 
      and f.profile_id = auth.uid()
    )
  );

-- Policy: users can insert their own flow reflections
create policy "Users can insert their own flow reflections"
  on public.flow_reflections for insert
  with check (
    exists (
      select 1 from public.flows f 
      where f.id = flow_reflections.flow_id 
      and f.profile_id = auth.uid()
    )
  );

-- 2) Summary RPC (distance, elapsed, SUI, top venues, median energy)
create or replace function public.flow_summary(_flow_id uuid)
returns json
language sql stable security definer
set search_path = public
as $$
with s as (
  select fs.idx, fs.arrived_at, fs.departed_at, fs.center, fs.venue_id,
         (fs.vibe_vector->>'energy')::float as energy
  from flow_segments fs
  where fs.flow_id = _flow_id
  order by fs.idx
),
lines as (
  select s.idx, s.arrived_at, s.departed_at, s.venue_id, s.energy,
         st_distance(st_transform(s.center,3857),
                     st_transform(lead(s.center) over (order by s.idx),3857)) as seg_dist_m
  from s
),
agg as (
  select coalesce(sum(seg_dist_m),0)::float as distance_m,
         min(arrived_at) as started_at,
         coalesce(max(coalesce(departed_at,arrived_at)), max(arrived_at)) as ended_at,
         percentile_cont(0.5) within group (order by energy) as energy_median
  from lines
),
venues as (
  select v.id, v.name, count(*) hits
  from s left join venues v on v.id = s.venue_id
  where v.id is not null
  group by v.id, v.name order by hits desc, v.name asc limit 5
),
flow_row as (select sun_exposed_min from flows where id=_flow_id)
select json_build_object(
  'flowId', _flow_id,
  'startedAt', agg.started_at,
  'endedAt',   agg.ended_at,
  'elapsedMin', extract(epoch from (agg.ended_at-agg.started_at))/60.0,
  'distanceM', agg.distance_m,
  'suiPct', case
    when extract(epoch from (agg.ended_at-agg.started_at)) > 0
    then round(100 * greatest(0, least(1,
         (select coalesce(sun_exposed_min,0) from flow_row)
         /(extract(epoch from (agg.ended_at-agg.started_at))/60.0))))
    else null end,
  'energyMedian', agg.energy_median,
  'topVenues', coalesce(
     (select json_agg(json_build_object('id',id,'name',name,'hits',hits)) from venues),
     '[]'::json
  )
)
from agg;
$$;

-- Grant execute permissions
grant execute on function public.flow_summary(uuid) to anon, authenticated;