BEGIN;

-- ─────────────────────────────────────────────────────────
-- Rename user_id to participant_id in plan_check_ins
-- ─────────────────────────────────────────────────────────

-- 1. rename the column
alter table public.plan_check_ins
  rename column user_id to participant_id;

-- 2. fix indexes that referenced user_id
drop index if exists idx_checkins_plan_stop;
drop index if exists idx_checkins_user_active;

create index if not exists idx_checkins_plan_stop
  on public.plan_check_ins(plan_id, stop_id, participant_id);

create index if not exists idx_checkins_user_active
  on public.plan_check_ins(participant_id)
  where checked_out_at is null;

-- ─────────────────────────────────────────────────────────
-- Update RLS policies for plan_check_ins
-- ─────────────────────────────────────────────────────────

-- SELECT
drop policy if exists checkins_member_read on public.plan_check_ins;
create policy checkins_member_read
  on public.plan_check_ins
  for select
  using (
    participant_id = auth.uid()
    or exists (
      select 1 from public.plan_participants pp
       where pp.plan_id = plan_check_ins.plan_id
         and pp.user_id = auth.uid()
    )
  );

-- INSERT
drop policy if exists checkins_member_write on public.plan_check_ins;
create policy checkins_member_write
  on public.plan_check_ins
  for insert
  with check (
    exists (
      select 1 from public.plan_participants pp
       where pp.plan_id = plan_check_ins.plan_id
         and pp.user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────
-- Update notification trigger
-- ─────────────────────────────────────────────────────────

create or replace function public.tg_plan_checkin_notify()
returns trigger
language plpgsql
as $$
begin
  insert into public.event_notifications (user_id, kind, payload)
  select pp.user_id,                       -- << correct
         'plan_checkin',
         jsonb_build_object(
           'plan_id', new.plan_id,
           'user_id',  new.participant_id,        -- << JSON keeps user_id for client
           'stop_id', new.stop_id
         )
  from public.plan_participants pp
  where pp.plan_id = new.plan_id
    and pp.user_id <> new.participant_id;  -- self-filter
  return new;
end;
$$;

drop trigger if exists trg_plan_checkin_notify on public.plan_check_ins;
create trigger trg_plan_checkin_notify
  after insert on public.plan_check_ins
  for each row execute procedure public.tg_plan_checkin_notify();

COMMIT;