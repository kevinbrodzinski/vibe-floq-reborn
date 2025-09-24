--====================================================================
--  Plans Main Page + Voting migration
--  (Supabase / PostgreSQL ≥ 14)
--====================================================================
begin;

-------------------------------------------------------------------
-- 0. Extensions                                                     --
-------------------------------------------------------------------
create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "pg_trgm";    -- fuzzy search later
create extension if not exists "btree_gin";  -- GIN on enum columns

-------------------------------------------------------------------
-- 1. Enum & table changes                                           --
-------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'plan_status_enum'
  ) then
    create type plan_status_enum
      as enum ('draft','finalized','executing','completed','archived');
  end if;
end$$;

alter table public.floq_plans
  add column if not exists archived_at           timestamptz,
  add column if not exists current_stop_id       uuid
       references public.plan_stops(id) on delete set null,
  add column if not exists execution_started_at  timestamptz,
  add column if not exists vibe_tag              text;

-- make sure status column exists and is the enum
do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema='public' and table_name='floq_plans'
       and column_name='status'
       and data_type<>'USER-DEFINED'
  ) then
    alter table public.floq_plans
      alter column status type plan_status_enum
      using status::plan_status_enum;
  end if;
exception when undefined_column then
  alter table public.floq_plans
    add column status plan_status_enum not null default 'draft';
end$$;

alter table public.floq_plans
  alter column status set default 'draft';

-- handy composite index for status dashboards
create index if not exists idx_floq_plans_status_archived
  on public.floq_plans (status, archived_at)
  where archived_at is null;

create index if not exists idx_floq_plans_planned_at_live
  on public.floq_plans (planned_at desc)
  where archived_at is null;

-------------------------------------------------------------------
-- 2. Voting table                                                   --
-------------------------------------------------------------------
create table if not exists public.plan_votes (
  id             uuid primary key default gen_random_uuid(),
  plan_id        uuid not null references public.floq_plans(id)  on delete cascade,
  stop_id        uuid not null references public.plan_stops(id)  on delete cascade,
  user_id        uuid not null,                 -- auth.uid()
  vote_type      text not null check (vote_type in ('up','down')),
  emoji_reaction text,
  comment        text,
  device_meta    jsonb,                         -- e.g. {model:"iOS-15",locale:"en-US"}
  created_at     timestamptz default now(),
  updated_at     timestamptz default now(),
  unique (stop_id, user_id)                    -- one vote per stop per user
);

-- trigger to keep updated_at fresh
create or replace function public.trg_touch_plan_votes() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end$$;

create trigger trg_plan_votes_touch
before update on public.plan_votes
for each row execute function public.trg_touch_plan_votes();

-- Indices for fast look-ups
create index if not exists idx_plan_votes_plan     on public.plan_votes(plan_id);
create index if not exists idx_plan_votes_stop     on public.plan_votes(stop_id);
create index if not exists idx_plan_votes_user     on public.plan_votes(user_id);
create index if not exists idx_plan_votes_vote     on public.plan_votes(vote_type);

-- RLS
alter table public.plan_votes enable row level security;

-- users may read any vote in plans where they're participants
create policy plan_votes_read
  on public.plan_votes
  for select
  using (
    exists (
      select 1 from public.plan_participants p
      where p.plan_id = plan_votes.plan_id
        and p.user_id = auth.uid()
    )
  );

-- users may insert / update / delete ONLY their own vote rows
create policy plan_votes_self_modify
  on public.plan_votes
  for all
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());

-------------------------------------------------------------------
-- 3. Functions – plans hub & summary                               --
-------------------------------------------------------------------
/* Helper: avoid row explosion by pre-aggregating participants/stops
           and then joining back on plans. */
create or replace function public.get_user_accessible_plans()
returns table (
  id                   uuid,
  title                text,
  planned_at           timestamptz,
  status               plan_status_enum,
  vibe_tag             text,
  archived_at          timestamptz,
  current_stop_id      uuid,
  execution_started_at timestamptz,
  participant_count    bigint,
  stops_count          bigint
)
language sql
security definer
set search_path = public,pg_temp
stable
as $$
  /* CTEs keep the query planner happy and DISTINCT-free */
  with my_plans as (
      select fp.*
      from public.floq_plans fp
      where fp.archived_at is null
        and (
          exists (select 1 from public.plan_participants pp
                   where pp.plan_id = fp.id and pp.user_id = auth.uid())
          or exists (select 1
                       from public.floq_participants fpart
                      where fpart.floq_id = fp.floq_id
                        and fpart.user_id = auth.uid())
        )
  ),
  counts as (
      select
        plan_id,
        count(distinct user_id)  as participant_count,
        0                        as dummy           -- placeholder for lateral join
      from public.plan_participants
      group by plan_id
  ),
  stop_counts as (
      select
        plan_id,
        count(*) as stops_count
      from public.plan_stops
      group by plan_id
  )
  select
    p.id, p.title, p.planned_at, p.status, p.vibe_tag,
    p.archived_at, p.current_stop_id, p.execution_started_at,
    coalesce(pc.participant_count,0) as participant_count,
    coalesce(sc.stops_count,0)       as stops_count
  from my_plans        p
  left join counts     pc on pc.plan_id = p.id
  left join stop_counts sc on sc.plan_id = p.id
  order by p.planned_at desc nulls last;
$$;

create or replace function public.get_user_plans_summary()
returns table (
  status_name text,
  plan_count  bigint
)
language sql
security definer
set search_path = public,pg_temp
stable
as $$
  select
    status::text as status_name,
    count(*)     as plan_count
  from public.get_user_accessible_plans()
  group by status
  order by
    case status::text
      when 'executing' then 1
      when 'finalized' then 2
      when 'draft'     then 3
      when 'completed' then 4
      else 5
    end;
$$;

grant execute on function public.get_user_accessible_plans() to authenticated;
grant execute on function public.get_user_plans_summary()   to authenticated;

-------------------------------------------------------------------
-- 4. (Optional) tiny helper to *rate-limit* vote / snap logging    --
-------------------------------------------------------------------
create table if not exists public.user_action_log (
  user_id    uuid     not null,
  action     text     not null,
  happened_at timestamptz default now(),
  primary key (user_id, action, happened_at)
);

--  simple: keep at most N per X minutes
create or replace function public.check_rate_limit(
  p_action text,
  p_limit  int  default 20,
  p_window interval default '5 minutes'
) returns boolean
language plpgsql stable as $$
declare v_cnt int;
begin
  select count(*) into v_cnt
  from public.user_action_log
  where user_id = auth.uid()
    and action  = p_action
    and happened_at >= now() - p_window;

  if v_cnt >= p_limit then
     return false;
  end if;

  insert into public.user_action_log(user_id,action) values (auth.uid(),p_action);
  return true;
end$$;

-------------------------------------------------------------------
commit;