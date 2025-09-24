-- Add recommendation tracking for Phase 3 observability
create table if not exists recommendation_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null,
  rec_type text not null check (rec_type in ('venue','activity','friend','timing')),
  rec_id text not null,
  shown_at timestamptz not null default now(),
  interacted_at timestamptz,
  action text check (action in ('click','save','dismiss','share')),
  model_version text,
  features jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Indexes for performance
create index if not exists idx_rec_events_profile on recommendation_events(profile_id, rec_type, shown_at desc);
create index if not exists idx_rec_events_interaction on recommendation_events(profile_id, interacted_at desc) where interacted_at is not null;

-- Enable RLS and add policies
alter table recommendation_events enable row level security;

create policy "Users can manage their own recommendation events"
  on recommendation_events for all 
  using (profile_id = auth.uid()) 
  with check (profile_id = auth.uid());