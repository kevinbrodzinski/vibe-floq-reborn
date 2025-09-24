/******************************************************************
  DM-media bucket  (images, voice-notes, emoji-stickers, …)
******************************************************************/

-- 1. bucket
insert into storage.buckets (id, name, public)
values ('dm_media', 'dm_media', false)
on conflict (id) do nothing;

-- 2. RLS for per-user isolation
--   Folder convention:  {user_id}/{thread_id}/{filename.ext}
--   auth.uid() must match the first path segment

create policy "dm_media_read_own"
  on storage.objects
  for select
  using (
    bucket_id = 'dm_media'
    and auth.uid()::text = (storage.foldername(name))[1]     -- first folder = userId
  );

create policy "dm_media_write_own"
  on storage.objects
  for insert
  with check (
    bucket_id = 'dm_media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "dm_media_update_own"
  on storage.objects
  for update
  using (
    bucket_id = 'dm_media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- (optional) delete-own policy
create policy "dm_media_delete_own"
  on storage.objects
  for delete
  using (
    bucket_id = 'dm_media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );