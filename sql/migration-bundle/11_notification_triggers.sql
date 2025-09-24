-- Add accepted_at column for invite acceptance events
alter table public.event_notifications
  add column if not exists accepted_at timestamptz;

-- Indexes & RLS for notifications
create index if not exists idx_notif_unseen
  on public.event_notifications (user_id, seen_at);

alter table public.event_notifications enable row level security;

create policy notif_owner_all
  on public.event_notifications
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 2-a Direct-message trigger
create or replace function notify_dm() returns trigger
language plpgsql as $$
declare
  recipient uuid;
begin
  select case
           when new.sender_id = dt.member_a then dt.member_b
           else dt.member_a
         end
  into recipient
  from public.direct_threads dt
  where dt.id = new.thread_id;

  insert into public.event_notifications
    (user_id, kind, payload)
  values
    (recipient, 'dm',
     jsonb_build_object(
       'thread_id', new.thread_id,
       'message_id', new.id,
       'preview', left(new.content,120)
     ));
  return new;
end;
$$;

drop trigger if exists trg_dm_notify on public.direct_messages;
create trigger trg_dm_notify
after insert on public.direct_messages
for each row execute function notify_dm();

-- 2-b Plan-invite trigger
create or replace function notify_plan_invite() returns trigger
language plpgsql as $$
begin
  insert into public.event_notifications
    (user_id, kind, payload)
  values
    (new.invitee_id, 'plan_invite',
     jsonb_build_object(
       'plan_id', new.plan_id,
       'inviter_id', new.inviter_id
     ));
  return new;
end;
$$;

drop trigger if exists trg_plan_invite_notify on public.plan_invites;
create trigger trg_plan_invite_notify
after insert on public.plan_invites
for each row execute function notify_plan_invite();

-- 2-c Floq-invite trigger
create or replace function notify_floq_invite() returns trigger
language plpgsql as $$
begin
  insert into public.event_notifications
    (user_id, kind, payload)
  values
    (new.invitee_id, 'floq_invite',
     jsonb_build_object(
       'floq_id', new.floq_id,
       'inviter_id', new.inviter_id
     ));
  return new;
end;
$$;

drop trigger if exists trg_floq_invite_notify on public.floq_invitations;
create trigger trg_floq_invite_notify
after insert on public.floq_invitations
for each row execute function notify_floq_invite();