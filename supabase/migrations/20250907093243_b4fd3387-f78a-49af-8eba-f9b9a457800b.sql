-- 20250907__p4_flow_samples_step1.sql

-- UUIDs for ids
create extension if not exists pgcrypto;

-- Base table for k-safe flow logging (no FK to avoid external deps)
create table if not exists public.flow_samples (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null,
  hour_bucket int not null check (hour_bucket between 0 and 23),
  dow int not null check (dow between 0 and 6), -- 0=Sun
  cell_x int not null,
  cell_y int not null,
  vx real not null,
  vy real not null,
  weight real not null default 1.0,
  recorded_at timestamptz not null default now()
);

-- RLS: enable and allow INSERTs from authenticated users only.
alter table public.flow_samples enable row level security;

drop policy if exists flow_samples_insert on public.flow_samples;
create policy flow_samples_insert
  on public.flow_samples
  for insert
  to authenticated
  with check (
    hour_bucket between 0 and 23
    and dow between 0 and 6
    and weight > 0
  );

-- Deny SELECT/UPDATE/DELETE by omission. Reads will come via a k-safe view in step 2.

-- Performance indexes
create index if not exists idx_flow_samples_spatial
  on public.flow_samples (city_id, hour_bucket, dow, cell_x, cell_y);

create index if not exists idx_flow_samples_recorded_at
  on public.flow_samples (recorded_at desc);