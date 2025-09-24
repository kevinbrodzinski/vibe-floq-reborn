-- Fix 400 errors on friend_requests by adding missing FK joins

alter table public.friend_requests
  add constraint fk_friend_requests_user
  foreign key (user_id) references public.profiles(id) on delete cascade;

alter table public.friend_requests
  add constraint fk_friend_requests_friend
  foreign key (friend_id) references public.profiles(id) on delete cascade;

create index if not exists idx_friend_requests_user   on public.friend_requests(user_id);
create index if not exists idx_friend_requests_friend on public.friend_requests(friend_id);

comment on constraint fk_friend_requests_user   on public.friend_requests
  is 'enables PostgREST embed for requester';
comment on constraint fk_friend_requests_friend on public.friend_requests
  is 'enables PostgREST embed for target';