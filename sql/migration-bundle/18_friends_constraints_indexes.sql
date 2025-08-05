BEGIN;

-- ─────────────────────────────────────────────────────────
-- friends table indexes and constraints
-- ─────────────────────────────────────────────────────────
create index if not exists idx_friends_user_a   on public.friends(user_a);
create index if not exists idx_friends_user_b   on public.friends(user_b);

-- guard against duplicates / reverse duplicates
create unique index if not exists uniq_friends_pair
  on public.friends( least(user_a,user_b), greatest(user_a,user_b) );

-- Add foreign key constraints
alter table public.friends
  add constraint if not exists fk_friends_user_a foreign key (user_a) references auth.users(id) on delete cascade,
  add constraint if not exists fk_friends_user_b foreign key (user_b) references auth.users(id) on delete cascade;

-- ─────────────────────────────────────────────────────────
-- friend_requests table indexes and constraints
-- ─────────────────────────────────────────────────────────
create index if not exists idx_friendreq_user   on public.friend_requests(user_id);
create index if not exists idx_friendreq_friend on public.friend_requests(friend_id);

-- prevent duplicate pendings
create unique index if not exists uniq_friendreq_pending
  on public.friend_requests( least(user_id,friend_id), greatest(user_id,friend_id) )
  where status = 'pending';

-- Add foreign key constraints
alter table public.friend_requests
  add constraint if not exists fk_friendreq_user foreign key (user_id)  references auth.users(id) on delete cascade,
  add constraint if not exists fk_friendreq_friend foreign key (friend_id) references auth.users(id) on delete cascade;

-- ─────────────────────────────────────────────────────────
-- RLS policies for friends
-- ─────────────────────────────────────────────────────────
drop policy if exists friends_read on public.friends;
create policy friends_read
  on public.friends
  for select
  using (auth.uid() in (user_a, user_b));

-- ─────────────────────────────────────────────────────────
-- RLS policies for friend_requests
-- ─────────────────────────────────────────────────────────
drop policy if exists friendreq_read on public.friend_requests;
create policy friendreq_read
  on public.friend_requests
  for select
  using (auth.uid() in (user_id, friend_id));

drop policy if exists friendreq_insert on public.friend_requests;
create policy friendreq_insert
  on public.friend_requests
  for insert
  with check (auth.uid() = user_id);   -- only requester inserts

COMMIT;