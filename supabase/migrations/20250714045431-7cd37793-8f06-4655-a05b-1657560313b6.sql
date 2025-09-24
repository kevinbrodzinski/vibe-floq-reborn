-- 1️⃣  Helper that bypasses RLS safely
create or replace function public.user_is_floq_participant(
  p_floq_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.floq_participants
    where floq_id = p_floq_id
      and user_id = coalesce(p_user_id, auth.uid())
  );
$$;

grant execute on function public.user_is_floq_participant(uuid, uuid) to authenticated;

-- 2️⃣  Remove circular policy on floqs
drop policy if exists "floqs_creator_or_participant_select" on public.floqs;

-- 3️⃣  Recreate clean floqs read policy (creator, public, or participant)
create policy floqs_public_or_creator_select
  on public.floqs
  for select
  using (
        visibility = 'public'
     or creator_id = auth.uid()
     or user_is_floq_participant(id)
  );

-- 4️⃣  Tighten floq_participants policies
drop policy if exists "fp: public floq participants viewable" on public.floq_participants;
drop policy if exists "fp: self view"                        on public.floq_participants;
drop policy if exists "fp: self delete"                      on public.floq_participants;

--   a) Participant can read their own row
create policy fp_self_view
  on public.floq_participants
  for select
  using ( user_id = auth.uid() );

--   b) Anyone may read rows for PUBLIC floqs (no cross-table reference)
create policy fp_public_floq_view
  on public.floq_participants
  for select
  using (
    exists (
      select 1
      from public.floqs f
      where f.id = floq_participants.floq_id
        and f.visibility = 'public'
    )
  )
  with check ( false );  -- prevents INSERT via this policy

--   c) Allow participant to delete their own row (leave floq)
create policy fp_self_delete
  on public.floq_participants
  for delete
  using ( user_id = auth.uid() );

--   d) (optional) creator / co-admin mutating rights
create policy fp_creator_admin_modify
  on public.floq_participants
  for all
  using (
        user_is_floq_participant(floq_id)   -- caller must be participant
    and exists (
          select 1
          from public.floq_participants p2
          where p2.floq_id = floq_participants.floq_id
            and p2.user_id = auth.uid()
            and p2.role in ('creator','co-admin')
        )
  )
  with check ( true );  -- same condition for INSERT/UPDATE