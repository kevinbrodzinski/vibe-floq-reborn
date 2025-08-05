-- Plan invites realtime notification trigger
create or replace function public.notify_plan_invite()
returns trigger
language plpgsql as $$
begin
  perform pg_notify(
    'plan_invite',
    json_build_object(
      'plan_id', new.plan_id,
      'user_id', new.user_id,
      'status',  new.status
    )::text
  );

  -- Call edge function to send push notification
  perform
    net.http_post(
      'https://reztyrrafsmlvvlqvsqt.supabase.co/functions/v1/send-plan-invite',
      json_build_object('plan_id', new.plan_id, 'user_id', new.user_id)::text,
      'application/json'::text,
      jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_role_key', true))
    );

  return new;
end;
$$;

drop trigger if exists trg_plan_invite_notify on public.plan_invites;
create trigger trg_plan_invite_notify
  after insert on public.plan_invites
  for each row execute function public.notify_plan_invite();