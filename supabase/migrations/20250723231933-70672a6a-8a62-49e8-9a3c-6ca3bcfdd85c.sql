-- ===================================================================
-- Avatar bucket RLS policies     (runs fine under supabase_migrations)
-- ===================================================================

-- 1) Make sure the avatars bucket exists
insert into storage.buckets (id, name)
values ('avatars', 'avatars')
on conflict (id) do nothing;      -- safe for re-run

-- 2) Replace old policies
drop policy if exists "Avatar images public read"  on storage.objects;
drop policy if exists "Avatar upload own folder"   on storage.objects;
drop policy if exists "Avatar update own files"    on storage.objects;
drop policy if exists "Avatar delete own files"    on storage.objects;

-- 3) Public read
create policy "Avatar images public read"
  on storage.objects
  for select
  using (bucket_id = 'avatars');

-- 4) Authenticated CRUD in their own folder
create policy "Avatar upload own folder"
  on storage.objects
  for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Avatar update own files"
  on storage.objects
  for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Avatar delete own files"
  on storage.objects
  for delete
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- 4) Keep function search_path pinned (runs fine under migrations role)
alter function public.handle_new_user()          set search_path = public;
alter function public.update_updated_at_column() set search_path = public;