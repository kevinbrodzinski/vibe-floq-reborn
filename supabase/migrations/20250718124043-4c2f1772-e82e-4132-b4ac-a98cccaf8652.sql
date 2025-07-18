
-- Create plan_invites table with proper RLS and triggers
create table if not exists public.plan_invites (
  plan_id uuid not null references public.floq_plans(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('pending','accepted','declined')) default 'pending',
  inserted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (plan_id, user_id)
);

-- Enable RLS
alter table public.plan_invites enable row level security;

-- RLS Policies
create policy owner_can_invite
  on public.plan_invites for insert
  with check (
    exists (
      select 1 from public.floq_plans p
      where p.id = plan_invites.plan_id
        and p.creator_id = auth.uid()
    )
  );

create policy invitee_or_owner_can_read
  on public.plan_invites for select
  using (
    plan_invites.user_id = auth.uid()
    or exists (
        select 1 from public.floq_plans p
        where p.id = plan_invites.plan_id
          and p.creator_id = auth.uid()
    )
  );

create policy invitee_can_update_status
  on public.plan_invites for update
  using (plan_invites.user_id = auth.uid())
  with check (plan_invites.user_id = auth.uid());

-- Updated timestamp trigger
create or replace function public.tg_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger trg_plan_invites_touch
  before update on public.plan_invites
  for each row
  execute function public.tg_touch_updated_at();

-- Updated RPC function
create or replace function public.invite_friends(
  p_plan_id  uuid,
  p_user_ids uuid[]
)
returns json
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  _creator uuid;
  _inserted json;
begin
  if cardinality(p_user_ids) = 0 then
    return '[]'::json;
  end if;

  -- fast ownership check (security definer means we still need to guard!)
  select creator_id into _creator
    from public.floq_plans
   where id = p_plan_id;

  if _creator <> auth.uid() then
    raise exception 'Permission denied – only plan creator may invite';
  end if;

  insert into public.plan_invites (plan_id, user_id)
  select p_plan_id, unnest(p_user_ids)
  on conflict do nothing
  returning json_build_object(
    'plan_id', plan_id,
    'user_id', user_id,
    'status' , status
  )
  into _inserted;

  return coalesce(
    (select json_agg(_inserted)),
    '[]'::json
  );
end;
$$;

-- Realtime notification trigger
create or replace function public.notify_plan_invite()
returns trigger
language plpgsql as $$
begin
  perform pg_notify(
    'plan_invite',
    json_build_object(
      'plan_id', new.plan_id,
      'user_id', new.user_id,
      'status', new.status
    )::text
  );
  return new;
end;
$$;

drop trigger if exists trg_plan_invite on public.plan_invites;
create trigger trg_plan_invite
  after insert on public.plan_invites
  for each row execute procedure notify_plan_invite();
