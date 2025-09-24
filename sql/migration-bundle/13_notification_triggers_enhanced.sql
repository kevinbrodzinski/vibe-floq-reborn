-- Enhanced notification triggers for friend requests, floq invites, and plan invites

-- 2-A helper function (re-used by all three features)
create or replace function public.fn_emit_notification(
  p_user_id uuid,
  p_kind text,
  p_payload jsonb
)
returns void
language sql security definer
as $$
  insert into public.event_notifications (user_id, kind, payload)
  values (p_user_id, p_kind, p_payload);
$$;

grant execute on function public.fn_emit_notification to authenticated;

-- 2-B Friend-requests trigger
create or replace function public.fn_notify_friend_request()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'INSERT' and new.status = 'pending') then
       -- receiver gets "friend_request"
       perform fn_emit_notification(
         new.friend_id,
         'friend_request',
         jsonb_build_object('request_id', new.id, 'from', new.user_id)
       );

  elsif (tg_op = 'UPDATE' and old.status='pending'
         and new.status in ('accepted','declined')) then
       -- requester gets result
       perform fn_emit_notification(
         new.user_id,
         'friend_request_'||new.status,    -- friend_request_accepted / declined
         jsonb_build_object('request_id', new.id, 'by', new.friend_id)
       );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_friend_request_notify on public.friend_requests;
create trigger trg_friend_request_notify
after insert or update on public.friend_requests
for each row execute function public.fn_notify_friend_request();

-- 2-C Floq-invite trigger
create or replace function public.fn_notify_floq_invite()
returns trigger
language plpgsql
as $$
begin
  if (tg_op='INSERT' and new.status='pending') then
      perform fn_emit_notification(
        new.invitee_id,
        'floq_invite',
        jsonb_build_object('invite_id', new.id,
                           'floq_id', new.floq_id,
                           'from', new.inviter_id)
      );
  elsif (tg_op='UPDATE' and old.status='pending'
         and new.status in ('accepted','declined')) then
      perform fn_emit_notification(
        new.inviter_id,
        'floq_invite_'||new.status, -- floq_invite_accepted / declined
        jsonb_build_object('invite_id', new.id, 'by', new.invitee_id)
      );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_floq_invite_notify on public.floq_invitations;
create trigger trg_floq_invite_notify
after insert or update on public.floq_invitations
for each row execute function public.fn_notify_floq_invite();

-- 2-D Plan-invite trigger
create or replace function public.fn_notify_plan_invite()
returns trigger
language plpgsql
as $$
begin
  if (tg_op='INSERT' and new.status='pending') then
      perform fn_emit_notification(
        new.invitee_user_id,
        'plan_invite',
        jsonb_build_object('invite_id', new.id,
                           'plan_id', new.plan_id,
                           'from', new.inviter_id)
      );
  elsif (tg_op='UPDATE' and old.status='pending'
         and new.status in ('accepted','declined')) then
      perform fn_emit_notification(
        new.inviter_id,
        'plan_invite_'||new.status,
        jsonb_build_object('invite_id', new.id, 'by', new.invitee_user_id)
      );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_plan_invite_notify on public.plan_invitations;
create trigger trg_plan_invite_notify
after insert or update on public.plan_invitations
for each row execute function public.fn_notify_plan_invite();