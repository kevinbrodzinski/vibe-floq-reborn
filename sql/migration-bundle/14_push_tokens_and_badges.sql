--------------------------------------------------------------
-- 1. Device-scoped push tokens
--------------------------------------------------------------
create table if not exists public.user_push_tokens (
  user_id      uuid            not null references auth.users(id) on delete cascade,
  device_id    text            not null,               -- e.g. expoInstallationId or APNs deviceToken
  token        text            not null,               -- raw FCM / APNs / Expo token
  platform     text            not null check (platform in ('ios','android','web')),
  last_seen_at timestamptz     not null default now(),
  badge_count  int             not null default 0,
  primary key  (user_id, device_id)
);

-- simple look-ups
create index if not exists idx_push_token_user on public.user_push_tokens(user_id);

-- 🔐  RLS
alter table public.user_push_tokens enable row level security;

create policy push_token_owner_all
  on public.user_push_tokens
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

--------------------------------------------------------------
-- 2. RPC helpers
--------------------------------------------------------------
-- (A) upsert / refresh token from client
create or replace function public.store_push_token(
  p_device_id text,
  p_token     text,
  p_platform  text
) returns void
language sql
security definer                   -- allow call from anon / authenticated
set search_path to public
as $$
  insert into public.user_push_tokens
         (user_id, device_id, token, platform, last_seen_at)
  values (auth.uid(), p_device_id, p_token, p_platform, now())
  on conflict (user_id, device_id)
       do update set token        = excluded.token,
                     platform     = excluded.platform,
                     last_seen_at = now();
$$;

grant execute on function public.store_push_token to authenticated, anon;

-- (B) reset badge when app is opened
create or replace function public.reset_badge() returns void
language sql
security definer
set search_path to public
as $$
  update public.user_push_tokens
     set badge_count = 0
   where user_id = auth.uid();
$$;

grant execute on function public.reset_badge to authenticated;

--------------------------------------------------------------
-- 3. AFTER INSERT trigger on event_notifications
--------------------------------------------------------------
create or replace function public.bump_badge()
returns trigger
language plpgsql
as $$
begin
  update public.user_push_tokens
     set badge_count = badge_count + 1
   where user_id = new.user_id;
  return new;
end;
$$;

drop trigger if exists trg_bump_badge on public.event_notifications;
create trigger trg_bump_badge
  after insert on public.event_notifications
  for each row execute procedure public.bump_badge();