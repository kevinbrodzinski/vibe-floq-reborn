-- ============================================================
-- Phase 2 – Performance Optimization
-- Generated: 2025-07-21 20:22 UTC  (rev-A)
-- ============================================================

-- 1. ------------------------------------------------------------------
-- Set-based reorder function
create or replace function public.reorder_plan_stops(
  p_plan_id uuid,
  p_stop_orders jsonb  -- [{id, stop_order}, …]
)
returns void
language plpgsql volatile
security definer
set search_path = public
as $$
begin
  -- Access check: participant or floq member
  if not exists (
      select 1 from public.plan_participants
      where plan_id = p_plan_id and user_id = auth.uid()
    )
    and not exists (
      select 1
      from public.floq_plans fp
      join public.floq_participants fpar
        on fpar.floq_id = fp.floq_id
      where fp.id = p_plan_id
        and fpar.user_id = auth.uid()
    )
  then
    raise exception 'Access denied to plan %', p_plan_id;
  end if;

  -- Bulk update
  update public.plan_stops ps
  set    stop_order = v.stop_order
  from (
    select (elem->>'id')::uuid        as id,
           (elem->>'stop_order')::int as stop_order
    from   jsonb_array_elements(p_stop_orders) elem
  ) v
  where ps.id = v.id
    and ps.plan_id = p_plan_id;

  -- Touch plan.updated_at
  update public.floq_plans
  set    updated_at = now()
  where  id = p_plan_id;
end;
$$;

grant execute on function public.reorder_plan_stops(uuid, jsonb) to authenticated;

-- 2. ------------------------------------------------------------------
-- Indexes (plain CREATE so they run inside txn)
create index if not exists idx_plan_stops_plan_start
  on public.plan_stops (plan_id, start_time asc nulls last);

create index if not exists idx_floq_activity_floq_created
  on public.floq_activity (floq_id, created_at desc);

create index if not exists idx_plan_participants_plan_user
  on public.plan_participants (plan_id, user_id);

create index if not exists idx_plan_votes_stop_user
  on public.plan_votes (stop_id, user_id);

-- 3. ------------------------------------------------------------------
-- De-duplicate stop_order then enforce uniqueness
with dups as (
  select id,
         plan_id,
         stop_order,
         row_number() over (partition by plan_id, stop_order
                            order by created_at, id) as rn
  from public.plan_stops
  where stop_order is not null
)
update public.plan_stops ps
set    stop_order = d.stop_order + d.rn - 1
from   dups d
where  ps.id = d.id
  and  d.rn > 1;

create unique index if not exists idx_plan_stops_order_unique
  on public.plan_stops (plan_id, stop_order)
  where stop_order is not null;

-- 4. ------------------------------------------------------------------
-- Guest name column for attribution
alter table public.plan_votes
  add column if not exists guest_name text;

comment on column public.plan_votes.guest_name
  is 'Guest user display name for unauthenticated votes';

-- 5. ------------------------------------------------------------------
-- Presence cleanup as function only (schedule via Edge Function task)
create or replace function public.cleanup_expired_presence()
returns integer
language plpgsql security definer
set search_path = public
as $$
declare
  deleted integer;
begin
  delete from public.user_vibe_states
  where last_updated < now() - interval '2 hours'
     or (not active and last_updated < now() - interval '30 minutes');
  get diagnostics deleted = row_count;
  return deleted;
end;
$$;

grant execute on function public.cleanup_expired_presence() to authenticated;

-- NOTE: schedule this via Supabase Task Scheduler or edge cron job
-- e.g. supabase link task: every 15m -> select public.cleanup_expired_presence();