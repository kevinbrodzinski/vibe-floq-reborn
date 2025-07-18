-- ============================================================================
--  FIELD · Phase-1  PATCH  •  refactor refresh + add cleanup
-- ============================================================================

-- 0.  EXTENSIONS  (no-ops if already present)
create extension if not exists pg_cron;

-- ────────────────────────────────────────────────────────────────────────────
-- 1.  REFRESH FUNCTION  (uses pre-computed gh5)
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.refresh_field_tiles()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  with agg as (
    select
      gh5                                           as tile_id,
      count(*)::int                                 as crowd_count,
      jsonb_build_object(
        'h', avg(vibe_h)::real,
        's', avg(vibe_s)::real,
        'l', avg(vibe_l)::real
      )                                             as avg_vibe,
      array_remove(array_agg(distinct floq_id),NULL) as active_floq_ids
    from public.vibes_now
    where expires_at > now()
      and gh5 is not null
    group by gh5
  )
  insert into public.field_tiles (tile_id, crowd_count, avg_vibe,
                                  active_floq_ids, updated_at)
  select tile_id, crowd_count, avg_vibe, active_floq_ids, now()
  from   agg
  on conflict (tile_id) do update
    set crowd_count     = excluded.crowd_count,
        avg_vibe        = excluded.avg_vibe,
        active_floq_ids = excluded.active_floq_ids,
        updated_at      = excluded.updated_at;
end;
$$;

grant execute on function public.refresh_field_tiles() to service_role;

-- ────────────────────────────────────────────────────────────────────────────
-- 2.  CLEANUP FUNCTION  (runs every 60 s, prunes stale tiles)
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.cleanup_field_tiles()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.field_tiles
  where updated_at < now() - interval '5 minutes';
end;
$$;

grant execute on function public.cleanup_field_tiles() to service_role;

-- ────────────────────────────────────────────────────────────────────────────
-- 3.  CRON  • keep 5-second refresh, add/replace 60-second cleanup
-- ────────────────────────────────────────────────────────────────────────────
-- refresh job already exists; if not, create it
select
  case when not exists
         (select 1 from cron.job where jobname = 'refresh_field_tiles_5s')
       then cron.schedule(
         'refresh_field_tiles_5s',
         '*/5 * * * * *',
         $$select public.refresh_field_tiles();$$)
  end;

-- replace cleanup job (safe for re-run)
select cron.unschedule('cleanup_field_tiles_60s');
select cron.schedule(
  'cleanup_field_tiles_60s',
  '0 * * * * *',          -- every 60 s at second 0
  $$select public.cleanup_field_tiles();$$
);

-- ============================================================================
--  END  •  refresh uses gh5, cleanup moved to its own 60 s cron
-- ============================================================================