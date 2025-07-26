BEGIN;

--------------------------------------------------------------------
-- 1. Floq message reactions  ❤️ 👍 🤩
--------------------------------------------------------------------
create table if not exists public.floq_message_reactions (
  id          uuid primary key default gen_random_uuid(),
  message_id  uuid not null references public.floq_messages(id) on delete cascade,
  user_id     uuid not null references auth.users(id)           on delete cascade,
  emoji       text not null check (char_length(emoji) <= 8),
  created_at  timestamptz not null default now(),

  unique (message_id, user_id, emoji)              -- prevent duplicate reactions
);

create index if not exists idx_fmr_message on public.floq_message_reactions(message_id);

-- RLS – any participant may read, only owner may insert/delete
alter table public.floq_message_reactions enable row level security;

create policy fmr_select
  on public.floq_message_reactions
  for select
  using (
    exists (select 1 from public.floq_participants fp
             where fp.floq_id = (select fm.floq_id from public.floq_messages fm where fm.id = message_id)
               and fp.user_id = auth.uid())
  );

create policy fmr_owner_insert
  on public.floq_message_reactions
  for insert
  with check (auth.uid() = user_id);

create policy fmr_owner_delete
  on public.floq_message_reactions
  for delete
  using (auth.uid() = user_id);

--------------------------------------------------------------------
-- 2. Inline reply thread-id on messages (add FK already in UI)
--------------------------------------------------------------------
alter table public.floq_messages
  add column if not exists reply_to_id uuid references public.floq_messages(id) on delete set null;

create index if not exists idx_fm_reply_to on public.floq_messages(reply_to_id);

--------------------------------------------------------------------
-- 3. Trigger helpers ------------------------------------------------
--------------------------------------------------------------------
-- notify other participants when a reaction is added
create or replace function public.tg_floq_reaction_notify()
returns trigger
language plpgsql
as $$
declare
  f_id uuid;
begin
  select floq_id into f_id from public.floq_messages where id = new.message_id;
  -- fan-out to all participants except the reactor
  insert into public.event_notifications(user_id, kind, payload)
  select fp.user_id,
         'floq_reaction',
         jsonb_build_object('floq_id', f_id, 'message_id', new.message_id, 'emoji', new.emoji, 'from', new.user_id)
  from public.floq_participants fp
  where fp.floq_id = f_id
    and fp.user_id <> new.user_id;
  return new;
end;
$$;

drop trigger if exists trg_floq_reaction_notify on public.floq_message_reactions;
create trigger trg_floq_reaction_notify
  after insert on public.floq_message_reactions
  for each row when (TG_OP = 'INSERT') execute procedure public.tg_floq_reaction_notify();

-- optional: notify original author when someone replies to their message
create or replace function public.tg_floq_reply_notify()
returns trigger
language plpgsql
as $$
declare
  original_author uuid;
begin
  if new.reply_to_id is null then
    return new;
  end if;

  select sender_id into original_author from public.floq_messages where id = new.reply_to_id;
  if original_author is null or original_author = new.sender_id then
    return new; -- self-reply or missing
  end if;

  insert into public.event_notifications(user_id, kind, payload)
  values ( original_author,
           'floq_reply',
           jsonb_build_object('floq_id', new.floq_id, 'reply_id', new.id, 'from', new.sender_id) );

  return new;
end;
$$;

drop trigger if exists trg_floq_reply_notify on public.floq_messages;
create trigger trg_floq_reply_notify
  after insert on public.floq_messages
  for each row execute procedure public.tg_floq_reply_notify();

COMMIT;