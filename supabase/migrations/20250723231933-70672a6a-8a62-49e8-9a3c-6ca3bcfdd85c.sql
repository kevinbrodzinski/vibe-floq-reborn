-- 1) Hard-lock RLS
ALTER TABLE storage.objects
  ENABLE ROW LEVEL SECURITY,
  FORCE ROW LEVEL SECURITY;

-- 2) Re-create avatar policies
DO $$
BEGIN
  -- Bail early if bucket doesn't exist
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'avatars') THEN
    RAISE NOTICE 'avatars bucket missing – create it first.';
    RETURN;
  END IF;

  -- Drop old
  DROP POLICY IF EXISTS "Avatar images public read"    ON storage.objects;
  DROP POLICY IF EXISTS "Avatar upload own folder"     ON storage.objects;
  DROP POLICY IF EXISTS "Avatar update own files"      ON storage.objects;
  DROP POLICY IF EXISTS "Avatar delete own files"      ON storage.objects;

  -- Re-add
  CREATE POLICY "Avatar images public read"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'avatars');

  CREATE POLICY "Avatar upload own folder"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
      bucket_id = 'avatars'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );

  CREATE POLICY "Avatar update own files"
    ON storage.objects
    FOR UPDATE
    USING (
      bucket_id = 'avatars'
      AND auth.uid()::text = (storage.foldername(name))[1]
    )
    WITH CHECK (   -- after-image must still be owned
      bucket_id = 'avatars'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );

  CREATE POLICY "Avatar delete own files"
    ON storage.objects
    FOR DELETE
    USING (
      bucket_id = 'avatars'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
END $$;

-- 3) Keep function search_path pinned
ALTER FUNCTION public.handle_new_user()          SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;