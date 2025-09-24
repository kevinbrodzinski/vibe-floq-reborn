-- Rally last seen tracking table
create table if not exists public.rally_last_seen (
  profile_id uuid not null,
  rally_id   uuid not null references public.rallies(id)  on delete cascade,
  last_seen  timestamptz not null default now(),
  primary key (profile_id, rally_id)
);

alter table public.rally_last_seen enable row level security;

-- Read your own rows
create policy "rls_seen_select_self"
on public.rally_last_seen
for select
using (profile_id = auth.uid());

-- Upsert/insert for yourself only
create policy "rls_seen_upsert_self"
on public.rally_last_seen
for insert
with check (profile_id = auth.uid());

-- Update your own row only
create policy "rls_seen_update_self"
on public.rally_last_seen
for update
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

-- Helpful join index (PK already covers most)
create index if not exists idx_seen_rally on public.rally_last_seen(rally_id);

-- Helper function: participants (creator + invitees)
create or replace function public._rally_roles()
returns table (
  rally_id   uuid,
  profile_id uuid,
  role       text
) language sql stable as $$
  select r.id, r.creator_id, 'creator'
  from public.rallies r
  where r.status = 'active'
  union all
  select i.rally_id, i.to_profile, 'invitee'
  from public.rally_invites i
  join public.rallies r on r.id = i.rally_id
  where r.status = 'active' and r.expires_at > now()
$$;

-- Drop and recreate MV with unread counts
drop materialized view if exists public.mv_rally_inbox cascade;

create materialized view public.mv_rally_inbox as
with roles as (
  select * from public._rally_roles()
),
last_msg as (
  select rt.rally_id::uuid,
         max(m.created_at) as last_message_at,
         (array_agg(m.kind || coalesce(' '|| m.body, '') order by m.created_at desc))[1] as last_message_excerpt
  from public.rally_messages m
  join public.rally_threads rt on rt.id = m.thread_id
  group by rt.rally_id
),
joined as (
  select rally_id,
         count(*) filter (where status='joined')  as joined_count,
         count(*) filter (where status='pending') as pending_count
  from public.rally_invites
  group by 1
),
unread as (
  -- per (profile,rally) messages after last_seen
  select
    rr.profile_id,
    rt.rally_id::uuid,
    count(*)::int as unread_count
  from _rally_roles() rr
  join public.rally_threads rt on rt.rally_id::uuid = rr.rally_id
  join public.rally_messages m on m.thread_id = rt.id
  left join public.rally_last_seen ls
    on ls.profile_id = rr.profile_id and ls.rally_id = rr.rally_id
  where m.created_at > coalesce(ls.last_seen, 'epoch'::timestamptz)
  group by 1,2
)
select
  rr.profile_id,
  r.id              as rally_id,
  r.creator_id,
  r.status,
  r.created_at,
  r.expires_at,
  r.venue_id,
  r.note,
  coalesce(j.joined_count,0)  as joined_count,
  coalesce(j.pending_count,0) as pending_count,
  lm.last_message_at,
  lm.last_message_excerpt,
  coalesce(u.unread_count,0)  as unread_count
from roles rr
join public.rallies r on r.id = rr.rally_id
left join last_msg lm on lm.rally_id = r.id
left join joined j   on j.rally_id  = r.id
left join unread u   on u.rally_id  = r.id and u.profile_id = rr.profile_id
where r.status = 'active' and r.expires_at > now();

-- Indexes for sub-10ms fetches
create index if not exists idx_mv_rally_inbox_profile_last
  on public.mv_rally_inbox(profile_id, last_message_at desc);

create index if not exists idx_mv_rally_inbox_profile_expires
  on public.mv_rally_inbox(profile_id, expires_at desc);

create unique index if not exists idx_mv_rally_inbox_unique
  on public.mv_rally_inbox(profile_id, rally_id);

-- Secure RPC to fetch for the current user
create or replace function public.get_rally_inbox()
returns setof public.mv_rally_inbox
language sql
security definer
set search_path = public
as $$
  select *
  from public.mv_rally_inbox
  where profile_id = auth.uid()
  order by coalesce(last_message_at, created_at) desc, expires_at desc
$$;

revoke all on function public.get_rally_inbox from public;
grant execute on function public.get_rally_inbox to authenticated, service_role;

-- Refresh function
create or replace function public.refresh_rally_inbox()
returns void
language plpgsql
security definer
as $$
begin
  refresh materialized view concurrently public.mv_rally_inbox;
end;
$$;

-- RPC: mark rally as seen
create or replace function public.mark_rally_seen(p_rally_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile uuid := auth.uid();
  v_allowed boolean;
begin
  if v_profile is null then
    raise exception 'not authenticated';
  end if;

  -- only participants (creator or invitee) may mark seen
  select exists (
    select 1
    from public.rallies r
    left join public.rally_invites i on i.rally_id = r.id
    where r.id = p_rally_id
      and (r.creator_id = v_profile or i.to_profile = v_profile)
  ) into v_allowed;

  if not v_allowed then
    raise exception 'access denied';
  end if;

  insert into public.rally_last_seen(profile_id, rally_id, last_seen)
  values (v_profile, p_rally_id, now())
  on conflict (profile_id, rally_id)
  do update set last_seen = excluded.last_seen;
end;
$$;

revoke all on function public.mark_rally_seen(uuid) from public;
grant execute on function public.mark_rally_seen(uuid) to authenticated, service_role;