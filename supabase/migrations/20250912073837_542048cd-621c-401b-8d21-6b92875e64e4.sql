-- Improve rally mark read with server-side timestamps (without immutable function issues)

-- Function to mark a rally as read with server timestamp
create or replace function rally_mark_seen(_rally_id text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into rally_last_seen (profile_id, rally_id, last_seen_at)
  values (auth.uid(), _rally_id, now())
  on conflict (profile_id, rally_id)
  do update set last_seen_at = excluded.last_seen_at
  where rally_last_seen.last_seen_at is distinct from excluded.last_seen_at;
$$;

-- Function to mark all rallies as read
create or replace function rally_mark_all_seen()
returns void
language sql
security definer
set search_path = public
as $$
  insert into rally_last_seen (profile_id, rally_id, last_seen_at)
  select auth.uid(), r.id, now()
  from rallies r
  join rally_invites i on i.rally_id = r.id and i.to_profile = auth.uid()
  where r.status in ('active','ended')
on conflict (profile_id, rally_id)
  do update set last_seen_at = excluded.last_seen_at
  where rally_last_seen.last_seen_at is distinct from excluded.last_seen_at;
$$;

-- Add indexes for performance
create index if not exists idx_rally_messages_thread_created
  on rally_messages(thread_id, created_at);

create index if not exists idx_rally_last_seen_profile_rally
  on rally_last_seen(profile_id, rally_id);