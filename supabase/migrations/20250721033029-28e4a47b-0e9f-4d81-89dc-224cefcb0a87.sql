-- 0. Prereqs -----------------------------------------------------------
alter table public.floq_plans
  add column if not exists creator_id uuid not null default auth.uid();

-- 1. Clean slate -------------------------------------------------------
drop policy if exists "floq_plans_create_own"           on public.floq_plans;
drop policy if exists "floq_plans_manage_access"        on public.floq_plans;
drop policy if exists "floq_plans_read_access"          on public.floq_plans;
drop policy if exists "floq_plans_creator_insert"       on public.floq_plans;
drop policy if exists "floq_plans_creator_participant_read"  on public.floq_plans;
drop policy if exists "floq_plans_creator_participant_modify" on public.floq_plans;

-- 2. Creator can insert -----------------------------------------------
create policy "floq_plans_creator_insert"
  on public.floq_plans
  for insert
  with check (creator_id = auth.uid());

-- 3. Creator & participants can read ----------------------------------
create policy "floq_plans_creator_participant_read"
  on public.floq_plans
  for select
  using (
    creator_id = auth.uid()
    or exists (
        select 1 from public.plan_participants pp
        where pp.plan_id = floq_plans.id and pp.user_id = auth.uid()
      )
    or (floq_id is not null and exists (
        select 1 from public.floq_participants fp
        where fp.floq_id = floq_plans.floq_id and fp.user_id = auth.uid()
      ))
  );

-- 4. Creator & participants can update / delete -----------------------
create policy "floq_plans_creator_participant_modify"
  on public.floq_plans
  for update, delete
  using (
    creator_id = auth.uid()
    or exists (
        select 1 from public.plan_participants pp
        where pp.plan_id = floq_plans.id and pp.user_id = auth.uid()
      )
  );

-- 5. Trigger to auto-add creator --------------------------------------
create or replace function public.add_plan_creator_as_participant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.plan_participants(plan_id, user_id, role, joined_at)
  values (new.id, new.creator_id, 'host', now())
  on conflict do nothing;
  return new;
end;
$$;

grant execute on function public.add_plan_creator_as_participant() to authenticated;

drop trigger if exists trg_add_plan_creator_participant on public.floq_plans;

create trigger trg_add_plan_creator_participant
after insert on public.floq_plans
for each row execute function public.add_plan_creator_as_participant();

-- 6. Helpful index -----------------------------------------------------
create index if not exists idx_plan_participants_pid_uid
  on public.plan_participants(plan_id, user_id);