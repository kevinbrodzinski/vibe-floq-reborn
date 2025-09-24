-- Efficient read index (optional, safe to run multiple times)
create index if not exists notif_to_profile_unread_created_idx
  on notifications(to_profile, read_at, created_at desc);

-- Mark specific notification IDs as read (only for the signed-in recipient)
create or replace function notifications_mark_read(_ids uuid[])
returns integer
language sql
security invoker
set search_path = public
as $$
  update notifications n
     set read_at = coalesce(n.read_at, now())
   where n.id = any(_ids)
     and n.to_profile = auth.uid()
  returning 1
$$;

-- Mark everything up to a timestamp as read (useful for "Mark all read")
create or replace function notifications_mark_read_upto(_upto timestamptz)
returns integer
language sql
security invoker
set search_path = public
as $$
  update notifications n
     set read_at = coalesce(n.read_at, now())
   where n.to_profile = auth.uid()
     and n.created_at <= _upto
  returning 1
$$;