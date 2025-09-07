-- Pre-reqs from Step-1:
-- table public.flow_samples with RLS enabled and INSERT policy for authenticated users.

-- 1) Aggregate function returning k-anonymous flow cells
--    SECURITY DEFINER but read-only; returns only aggregated safe data.
create or replace function public.flow_cells_k5(
  p_city_id uuid,
  p_hour int,
  p_dow  int,
  p_k    int default 5
)
returns table (
  city_id uuid,
  hour_bucket int,
  dow int,
  cell_x int,
  cell_y int,
  vx_avg real,
  vy_avg real,
  samples int
)
language sql
security definer
set search_path = public
as $$
  select
    city_id,
    hour_bucket,
    dow,
    cell_x,
    cell_y,
    avg(vx)::real  as vx_avg,
    avg(vy)::real  as vy_avg,
    count(*)::int  as samples
  from public.flow_samples
  where city_id = p_city_id
    and hour_bucket = p_hour
    and dow = p_dow
  group by city_id, hour_bucket, dow, cell_x, cell_y
  having count(*) >= p_k
  order by samples desc;
$$;

-- 2) Restrict function exposure to authenticated role only
revoke all on function public.flow_cells_k5(uuid,int,int,int) from public;
grant execute on function public.flow_cells_k5(uuid,int,int,int) to authenticated;

-- 3) Keep base table SELECT closed (no change)
--    (Do NOT add a SELECT policy on public.flow_samples.)