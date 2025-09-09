-- KV flags table for RareAurora gating
create table if not exists public.kv_flags (
  key text primary key,
  value jsonb default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists kv_flags_updated_at_idx on public.kv_flags(updated_at desc);

-- Enable RLS
alter table public.kv_flags enable row level security;

-- Policy: users can only access their own flags (based on key pattern)
create policy "Users can manage their own kv flags" on public.kv_flags
  for all using (
    key ~ ('^[^:]*:' || auth.uid()::text || '$') or
    key ~ ('^[^:]*:' || (select coalesce(nullif(current_setting('request.headers', true)::json->>'x-forwarded-for', ''), 'anon')) || '$')
  );