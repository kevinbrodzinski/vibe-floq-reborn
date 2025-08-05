-- Enhanced DM media storage bucket with proper RLS policies
-- 1-A create private bucket
insert into storage.buckets (id, name, public)
values ('dm_media', 'dm_media', false)
on conflict (id) do nothing;

-- 1-B upload/read policies
-- allow sender (and recipient) to read/write files in their thread
-- path pattern: <threadId>/<senderId>/<uuid>.jpg

create policy "dm_upload_own"
  on storage.objects for insert to authenticated
  with check ( 
    bucket_id = 'dm_media' and
    (storage.foldername(name))[2]::uuid = auth.uid()   -- senderId in path
  );

create policy "dm_read_participants" 
  on storage.objects for select using (
    bucket_id = 'dm_media' and
    (
      (storage.foldername(name))[2]::uuid = auth.uid()  -- sender can read
      or
      exists (
        select 1 from public.direct_threads dt 
        where dt.id = (storage.foldername(name))[1]::uuid
        and (dt.member_a = auth.uid() or dt.member_b = auth.uid())
      )
    )
  );

create policy "dm_update_own"
  on storage.objects for update using (
    bucket_id = 'dm_media' and
    (storage.foldername(name))[2]::uuid = auth.uid()
  );

create policy "dm_delete_own"
  on storage.objects for delete using (
    bucket_id = 'dm_media' and
    (storage.foldername(name))[2]::uuid = auth.uid()
  );