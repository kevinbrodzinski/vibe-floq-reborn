-- Onboarding v3: Server-authoritative progress tracking
-- Supersedes user_onboarding_progress with cleaner schema

create table if not exists public.onboarding_progress (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  version text not null default 'v3',
  step_index integer not null default 0,
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Updated-at trigger
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists onboarding_progress_set_updated on public.onboarding_progress;
create trigger onboarding_progress_set_updated
before update on public.onboarding_progress
for each row execute function public.tg_set_updated_at();

-- RLS policies
alter table public.onboarding_progress enable row level security;

drop policy if exists onboarding_progress_sel on public.onboarding_progress;
create policy onboarding_progress_sel
on public.onboarding_progress
for select using (profile_id = auth.uid());

drop policy if exists onboarding_progress_upsert on public.onboarding_progress;
create policy onboarding_progress_upsert
on public.onboarding_progress
for insert with check (profile_id = auth.uid());

drop policy if exists onboarding_progress_upd on public.onboarding_progress;
create policy onboarding_progress_upd
on public.onboarding_progress
for update using (profile_id = auth.uid())
with check (profile_id = auth.uid());

-- RPC to advance (atomic upsert with monotonic step progression)
create or replace function public.advance_onboarding(
  p_step_index int,
  p_version text,
  p_permissions jsonb default '{}'::jsonb
) returns public.onboarding_progress
language sql
security invoker
as $$
  insert into public.onboarding_progress (profile_id, version, step_index, permissions)
  values (auth.uid(), p_version, p_step_index, coalesce(p_permissions, '{}'::jsonb))
  on conflict (profile_id) do update
    set version = excluded.version,
        step_index = greatest(excluded.step_index, public.onboarding_progress.step_index),
        permissions = public.onboarding_progress.permissions || coalesce(excluded.permissions, '{}'::jsonb),
        updated_at = now()
  returning *;
$$;