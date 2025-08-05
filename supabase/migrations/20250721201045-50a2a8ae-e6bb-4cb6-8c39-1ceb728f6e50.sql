
-- ============================================================
-- Phase 1 – Critical Database Fixes
-- Generated: 2025-07-21 20:20 UTC
-- ============================================================

-- 1. ------------------------------------------------------------------
-- Activity logger function  (SECURITY DEFINER → bypass RLS safely)
create or replace function public.plan_to_floq_activity()
returns trigger
language plpgsql volatile
security definer
set search_path = public
as $$
begin
  if new.floq_id is not null then
    insert into public.floq_activity (
      floq_id,
      plan_id,
      user_id,
      kind,
      content,
      created_at
    )
    values (
      new.floq_id,
      new.id,
      coalesce(new.creator_id, auth.uid()),
      case tg_op
        when 'INSERT' then 'created'
        when 'UPDATE' then 'edited'
        else 'updated'
      end,
      case
        when tg_op = 'INSERT'
          then format('Plan "%s" created', new.title)
        when tg_op = 'UPDATE' and old.title is distinct from new.title
          then format('Plan "%s" renamed',   new.title)
        when tg_op = 'UPDATE' and old.status is distinct from new.status
          then format('Plan status changed to %s', new.status)
        else format('Plan "%s" modified', new.title)
      end,
      now()
    );
  end if;

  return coalesce(new, old);
end;
$$;

grant execute on function public.plan_to_floq_activity() to authenticated;

-- 2. ------------------------------------------------------------------
-- Trigger on floq_plans (re-create to ensure latest definition)
drop trigger if exists trg_plan_to_activity on public.floq_plans;

create trigger trg_plan_to_activity
after insert or update on public.floq_plans
for each row execute function public.plan_to_floq_activity();

-- 3. ------------------------------------------------------------------
-- RLS: allow participants / floq members to read votes
drop policy if exists "plan_votes_select_access" on public.plan_votes;

create policy "plan_votes_select_access"
  on public.plan_votes
  for select
  using (
    exists (
      select 1 from public.plan_participants pp
      where pp.plan_id = plan_votes.plan_id
        and pp.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.floq_plans fp
      join public.floq_participants fpar
        on fpar.floq_id = fp.floq_id
      where fp.id = plan_votes.plan_id
        and fpar.user_id = auth.uid()
    )
  );

-- 4. ------------------------------------------------------------------
-- Enforce vote-to-stop consistency with a DEFERRABLE FK
alter table public.plan_votes
  drop constraint if exists fk_vote_stop,
  drop constraint if exists check_plan_vote_consistency;

alter table public.plan_votes
  add constraint fk_vote_stop
    foreign key (stop_id)
    references public.plan_stops(id)
    on delete cascade
    deferrable initially deferred;

-- 5. ------------------------------------------------------------------
-- Unify timestamp types on plan_stops  (assumes stored as UTC already)
alter table public.plan_stops
  alter column start_time type timestamptz
    using start_time,
  alter column end_time   type timestamptz
    using end_time;

-- 6. ------------------------------------------------------------------
-- Temporal sanity check (deferrable so multi-step edits pass)
alter table public.plan_stops
  drop constraint if exists check_stop_timing;

alter table public.plan_stops
  add constraint check_stop_timing
    check (
      start_time is null
      or end_time   is null
      or start_time <= end_time
    )
    deferrable initially deferred;
