-- 1. add useful indexes
create index if not exists idx_floq_messages_floq_created
  on public.floq_messages (floq_id, created_at desc);

-- 2. replica identity full for perfect realtime diffs
alter table public.floq_messages replica identity full;

-- 3.   OPTIONAL:   delivery-state column (for edits / deletes later)
alter table public.floq_messages
  add column if not exists delivery_state text
    check (delivery_state in ('sent','edited','deleted'))
    default 'sent';