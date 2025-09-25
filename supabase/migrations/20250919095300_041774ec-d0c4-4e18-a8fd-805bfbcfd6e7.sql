-- 1) Stream events (AI & system cards)
create table if not exists public.floq_stream_events (
  id uuid primary key default gen_random_uuid(),
  floq_id uuid not null references public.floqs(id) on delete cascade,
  kind text not null check (kind in (
    'poll','venue_suggestion','time_picker','meet_halfway','reminder','recap'
  )),
  payload jsonb not null,         -- { title, options, venue_id, expires_at, ... }
  created_at timestamptz not null default now(),
  created_by uuid null references public.profiles(id),
  confidence numeric(3,2) null,   -- 0..1 from AI
  status text not null default 'active' check (status in ('active','dismissed','expired'))
);

-- 2) Poll votes
create table if not exists public.floq_poll_votes (
  event_id uuid not null references public.floq_stream_events(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  option_idx int not null,
  created_at timestamptz not null default now(),
  primary key (event_id, profile_id)
);

-- RLS: viewer must be floq member
alter table public.floq_stream_events enable row level security;
alter table public.floq_poll_votes enable row level security;

create policy "read stream events if floq member"
on public.floq_stream_events for select
using (exists (select 1 from floq_participants fp where fp.floq_id = floq_stream_events.floq_id and fp.profile_id = auth.uid()));

create policy "insert votes if floq member"
on public.floq_poll_votes for insert
with check (exists (select 1 from floq_participants fp where fp.profile_id = auth.uid() and fp.floq_id in (
  select floq_id from floq_stream_events where id = floq_poll_votes.event_id
)));

create policy "read votes if floq member"
on public.floq_poll_votes for select
using (exists (select 1 from floq_participants fp where fp.profile_id = auth.uid() and fp.floq_id in (
  select floq_id from floq_stream_events where id = floq_poll_votes.event_id
)));

-- Indexes for performance
create index if not exists idx_floq_stream_events_floq_created on public.floq_stream_events(floq_id, created_at desc);
create index if not exists idx_floq_stream_events_status on public.floq_stream_events(status);
create index if not exists idx_floq_poll_votes_event on public.floq_poll_votes(event_id);