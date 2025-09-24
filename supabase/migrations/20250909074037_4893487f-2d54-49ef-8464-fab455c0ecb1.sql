-- User-owned shortlist (a named set of venue_ids)
create table if not exists public.venue_shortlists (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null default auth.uid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.venue_shortlist_items (
  shortlist_id uuid not null references public.venue_shortlists(id) on delete cascade,
  venue_id text not null,
  added_at timestamptz not null default now(),
  primary key (shortlist_id, venue_id)
);

alter table public.venue_shortlists enable row level security;
alter table public.venue_shortlist_items enable row level security;

-- RLS: owner access only
create policy "shortlists_select_own" on public.venue_shortlists
  for select using (auth.uid() = profile_id);
create policy "shortlists_insert_own" on public.venue_shortlists
  for insert with check (auth.uid() = profile_id);
create policy "shortlists_delete_own" on public.venue_shortlists
  for delete using (auth.uid() = profile_id);

create policy "shortlist_items_select_own" on public.venue_shortlist_items
  for select using (exists (select 1 from public.venue_shortlists s where s.id = shortlist_id and s.profile_id = auth.uid()));
create policy "shortlist_items_insert_own" on public.venue_shortlist_items
  for insert with check (exists (select 1 from public.venue_shortlists s where s.id = shortlist_id and s.profile_id = auth.uid()));
create policy "shortlist_items_delete_own" on public.venue_shortlist_items
  for delete using (exists (select 1 from public.venue_shortlists s where s.id = shortlist_id and s.profile_id = auth.uid()));