-- Supabase Storage + Transform CDN Avatar System
-- Simple approach: public bucket with CDN transforms, no variant tables

-- Create public bucket with file limits and type restrictions
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars','avatars',true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO UPDATE
  SET public = true,
      file_size_limit = 5242880,
      allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif'];

-- Clean up any existing policies first
DROP POLICY IF EXISTS avatars_upload_policy ON storage.objects;
DROP POLICY IF EXISTS avatars_update_policy ON storage.objects;
DROP POLICY IF EXISTS avatars_delete_policy ON storage.objects;
DROP POLICY IF EXISTS avatars_read_policy ON storage.objects;

-- RLS: owner-only write, public read (fixed type casting)
CREATE POLICY avatars_upload_policy
ON storage.objects FOR INSERT
WITH CHECK (bucket_id='avatars' AND owner::uuid = auth.uid());

CREATE POLICY avatars_update_policy
ON storage.objects FOR UPDATE
USING (bucket_id='avatars' AND owner::uuid = auth.uid())
WITH CHECK (bucket_id='avatars' AND owner::uuid = auth.uid());

CREATE POLICY avatars_delete_policy
ON storage.objects FOR DELETE
USING (bucket_id='avatars' AND owner::uuid = auth.uid());

CREATE POLICY avatars_read_policy
ON storage.objects FOR SELECT
USING (bucket_id='avatars');

-- Clean up the avatar_variants table if it exists (we're not using it)
DROP TABLE IF EXISTS public.avatar_variants;