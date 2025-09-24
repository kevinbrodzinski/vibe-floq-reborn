-- Enable RLS
alter table public.floq_plans enable row level security;
alter table public.plan_participants enable row level security;
alter table public.plan_drafts enable row level security;
alter table public.plan_activities enable row level security;
alter table public.plan_ai_summaries enable row level security;

-- Helper: current user's profile_id
create or replace view public.v_me as
select id as profile_id from public.profiles where id = auth.uid();

-- Policies
do $$
begin
  -- floq_plans: creator or participant can select; creator can update draft fields
  if not exists (select 1 from pg_policies where polname = 'plans_select_visible') then
    create policy plans_select_visible on public.floq_plans
      for select using (
        creator_id = auth.uid()
        or exists (select 1 from public.plan_participants pp where pp.plan_id = floq_plans.id and pp.profile_id = auth.uid())
      );
  end if;

  if not exists (select 1 from pg_policies where polname = 'plans_insert_creator') then
    create policy plans_insert_creator on public.floq_plans
      for insert with check (creator_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where polname = 'plans_update_creator_draft') then
    create policy plans_update_creator_draft on public.floq_plans
      for update using (creator_id = auth.uid())
      with check (creator_id = auth.uid());
  end if;

  -- plan_participants: participants can see themselves; creator can see all
  if not exists (select 1 from pg_policies where polname = 'pp_select_visible') then
    create policy pp_select_visible on public.plan_participants
      for select using (
        profile_id = auth.uid()
        or exists (select 1 from public.floq_plans p where p.id = plan_participants.plan_id and p.creator_id = auth.uid())
      );
  end if;

  if not exists (select 1 from pg_policies where polname = 'pp_insert_creator') then
    create policy pp_insert_creator on public.plan_participants
      for insert with check (
        exists (select 1 from public.floq_plans p where p.id = plan_participants.plan_id and p.creator_id = auth.uid())
      );
  end if;

  -- plan_drafts: creator can read/write
  if not exists (select 1 from pg_policies where polname = 'drafts_rw_creator') then
    create policy drafts_rw_creator on public.plan_drafts
      for all using (
        exists (select 1 from public.floq_plans p where p.id = plan_drafts.plan_id and p.creator_id = auth.uid())
      )
      with check (
        exists (select 1 from public.floq_plans p where p.id = plan_drafts.plan_id and p.creator_id = auth.uid())
      );
  end if;

  -- activities & ai_summaries: visible to creator/participants
  if not exists (select 1 from pg_policies where polname = 'activities_select_visible') then
    create policy activities_select_visible on public.plan_activities
      for select using (
        exists (select 1 from public.plan_participants pp where pp.plan_id = plan_activities.plan_id and pp.profile_id = auth.uid())
        or exists (select 1 from public.floq_plans p where p.id = plan_activities.plan_id and p.creator_id = auth.uid())
      );
  end if;

  if not exists (select 1 from pg_policies where polname = 'ai_summaries_select_visible') then
    create policy ai_summaries_select_visible on public.plan_ai_summaries
      for select using (
        exists (select 1 from public.plan_participants pp where pp.plan_id = plan_ai_summaries.plan_id and pp.profile_id = auth.uid())
        or exists (select 1 from public.floq_plans p where p.id = plan_ai_summaries.plan_id and p.creator_id = auth.uid())
      );
  end if;

end$$;