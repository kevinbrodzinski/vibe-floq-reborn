-- STEP 3 — Trade winds materialization + refresh functions
-- Fixed version with proper row counting

-- 1) Target table for precomputed winds (readable; writes only via function)
create table if not exists public.trade_winds (
  id          uuid primary key default gen_random_uuid(),
  city_id     uuid                        not null,
  hour_bucket int                         not null check (hour_bucket between 0 and 23),
  dow         int                         not null check (dow between 0 and 6),  -- 0=Sun
  path_id     uuid                        not null,
  points      jsonb                       not null,  -- array of {x,y}
  strength    real                        not null check (strength between 0 and 1),
  avg_speed   real                        not null,
  support     real                        not null check (support between 0 and 1),
  updated_at  timestamptz                 not null default now()
);

-- 2) RLS: SELECT for authenticated; writes only via SECURITY DEFINER function
alter table public.trade_winds enable row level security;

drop policy if exists trade_winds_select on public.trade_winds;
create policy trade_winds_select
  on public.trade_winds
  for select
  to authenticated
  using (true);

-- 3) Indexes for lookup by city + time and by strength
create index if not exists idx_trade_winds_lookup
  on public.trade_winds (city_id, hour_bucket, dow, strength desc);

create index if not exists idx_trade_winds_updated_at
  on public.trade_winds (updated_at desc);

-- 4) SECURITY DEFINER function: refresh all winds for a single city
create or replace function public.refresh_trade_winds(
  p_city_id uuid,
  p_k int default 5,
  p_path_limit int default 24
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hour int;
  v_dow  int;
  v_inserted int := 0;
  v_batch_count int;
  _GRID int := 72;
  _SCALE real := 60.0;
begin
  delete from public.trade_winds where city_id = p_city_id;

  for v_hour in 0..23 loop
    for v_dow in 0..6 loop
      with cells as (
        select *
        from public.flow_cells_k5(p_city_id, v_hour, v_dow, p_k)
      ), scored as (
        select
          city_id,
          hour_bucket,
          dow,
          cell_x,
          cell_y,
          vx_avg,
          vy_avg,
          samples,
          greatest(sqrt(vx_avg*vx_avg + vy_avg*vy_avg), 0.0)::real as speed,
          least(1.0, greatest(sqrt(vx_avg*vx_avg + vy_avg*vy_avg),0.0) / 0.5)::real as strength,
          least(1.0, samples / 20.0)::real as support
        from cells
      ), limited as (
        select *
        from scored
        order by (strength*0.6 + support*0.4) desc
        limit p_path_limit
      ), ready as (
        select
          gen_random_uuid()                 as id,
          p_city_id                         as city_id,
          v_hour                            as hour_bucket,
          v_dow                             as dow,
          gen_random_uuid()                 as path_id,
          jsonb_build_array(
            jsonb_build_object(
              'x', (cell_x * _GRID),
              'y', (cell_y * _GRID)
            ),
            jsonb_build_object(
              'x', (cell_x * _GRID) + (vx_avg * _SCALE),
              'y', (cell_y * _GRID) + (vy_avg * _SCALE)
            )
          )                                 as points,
          strength                          as strength,
          speed                             as avg_speed,
          support                           as support,
          now()                             as updated_at
        from limited
      )
      insert into public.trade_winds (id, city_id, hour_bucket, dow, path_id, points, strength, avg_speed, support, updated_at)
      select id, city_id, hour_bucket, dow, path_id, points, strength, avg_speed, support, updated_at
      from ready;

      get diagnostics v_batch_count = row_count;
      v_inserted := v_inserted + v_batch_count;
    end loop;
  end loop;

  return v_inserted;
end;
$$;

-- 5) SECURITY DEFINER function: refresh for all cities
create or replace function public.refresh_trade_winds_all(
  p_k int default 5,
  p_path_limit int default 24
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_total int := 0;
begin
  for r in (select distinct city_id from public.flow_samples) loop
    v_total := v_total + public.refresh_trade_winds(r.city_id, p_k, p_path_limit);
  end loop;
  return v_total;
end;
$$;