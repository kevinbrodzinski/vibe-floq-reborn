-- ========== ENHANCED DIRECT MESSAGES SCHEMA ==========

-- ---------- direct_threads ------------------------------------------
create table if not exists public.direct_threads (
  id               uuid primary key default gen_random_uuid(),
  member_a         uuid not null references auth.users(id) on delete cascade,
  member_b         uuid not null references auth.users(id) on delete cascade,
  created_at       timestamptz default now(),
  last_message_at  timestamptz default now()
);

-- Add unique constraint separately to avoid syntax issues
create unique index if not exists uniq_thread_pair 
  on public.direct_threads (least(member_a,member_b), greatest(member_a,member_b));

-- Add index for conversation lists
create index if not exists idx_threads_last_msg
  on public.direct_threads (last_message_at desc);

-- ---------- direct_messages -----------------------------------------
create table if not exists public.direct_messages (
  id         uuid primary key default gen_random_uuid(),
  thread_id  uuid not null references public.direct_threads(id) on delete cascade,
  sender_id  uuid not null references auth.users(id) on delete cascade,
  content    text not null check (char_length(content) <= 4000),
  created_at timestamptz default now(),
  metadata   jsonb
);

create index if not exists idx_dm_thread_created
  on public.direct_messages (thread_id, created_at desc);

-- ---------- improved triggers ----------------------
create or replace function public.bump_thread_timestamp()
returns trigger language plpgsql as $$
begin
  update public.direct_threads
     set last_message_at = new.created_at
   where id = new.thread_id;
  return new;
end $$;

drop trigger if exists trg_bump_last on public.direct_messages;
create trigger trg_bump_last
  before insert on public.direct_messages
  for each row execute procedure public.bump_thread_timestamp();

-- ---------- security definer function -------------
create or replace function public.find_or_create_dm(a uuid, b uuid)
returns uuid language plpgsql security definer as $$
declare t uuid;
begin
  select id into t
    from public.direct_threads
   where least(member_a,member_b)=least(a,b)
     and greatest(member_a,member_b)=greatest(a,b);
  if t is null then
    insert into public.direct_threads(member_a,member_b)
         values(a,b) returning id into t;
  end if;
  return t;
end $$;

-- ---------- enhanced RLS -------
alter table public.direct_threads   enable row level security;
alter table public.direct_messages enable row level security;

create policy "threads: members read"
  on public.direct_threads for select
  using ( auth.uid() in (member_a, member_b) );

create policy "threads: members create"
  on public.direct_threads for insert
  with check ( auth.uid() in (member_a, member_b) );

create policy "messages: members read"
  on public.direct_messages for select
  using ( auth.uid() in (
          select member_a from public.direct_threads where id = thread_id
       union select member_b from public.direct_threads where id = thread_id
        ));

create policy "messages: members send"
  on public.direct_messages for insert
  with check (
    sender_id = auth.uid()
    and thread_id in (
      select id from public.direct_threads
       where auth.uid() in (member_a, member_b)
    )
  );

-- ---------- realtime NOTIFY ----------
create or replace function public.dm_notify()
returns trigger language plpgsql as $$
begin
  perform pg_notify(
    'dm:'||new.thread_id,
    jsonb_build_object(
      'id', new.id,
      'sender_id', new.sender_id,
      'content', new.content,
      'created_at', new.created_at
    )::text
  );
  return new;
end $$;

drop trigger if exists trg_dm_notify on public.direct_messages;
create trigger trg_dm_notify
  after insert on public.direct_messages
  for each row execute procedure public.dm_notify();