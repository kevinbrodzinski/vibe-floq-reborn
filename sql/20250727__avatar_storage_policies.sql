/* -------------------------------------------------------------------
   Migration: 20250727__avatar_storage_policies.sql
   Purpose: Add RLS policies for avatar storage bucket
-------------------------------------------------------------------- */

BEGIN;

-- Upload
DO $$
BEGIN
  IF NOT EXISTS (
      SELECT 1 FROM pg_policies
       WHERE policyname = 'Users can upload their own avatar'
         AND tablename  = 'objects'
  ) THEN
    CREATE POLICY "Users can upload their own avatar"
      ON storage.objects
      FOR INSERT
      WITH CHECK (
        bucket_id = 'avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END$$;

-- Update
DO $$
BEGIN
  IF NOT EXISTS (
      SELECT 1 FROM pg_policies
       WHERE policyname = 'Users can update their own avatar'
         AND tablename  = 'objects'
  ) THEN
    CREATE POLICY "Users can update their own avatar"
      ON storage.objects
      FOR UPDATE
      USING (
        bucket_id = 'avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END$$;

-- Delete
DO $$
BEGIN
  IF NOT EXISTS (
      SELECT 1 FROM pg_policies
       WHERE policyname = 'Users can delete their own avatar'
         AND tablename  = 'objects'
  ) THEN
    CREATE POLICY "Users can delete their own avatar"
      ON storage.objects
      FOR DELETE
      USING (
        bucket_id = 'avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END$$;

-- Public read
DO $$
BEGIN
  IF NOT EXISTS (
      SELECT 1 FROM pg_policies
       WHERE policyname = 'Avatar images are publicly accessible'
         AND tablename  = 'objects'
  ) THEN
    CREATE POLICY "Avatar images are publicly accessible"
      ON storage.objects
      FOR SELECT
      USING (bucket_id = 'avatars');
  END IF;
END$$;

COMMIT;