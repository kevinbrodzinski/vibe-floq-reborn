-- Phase 5: Enhanced RLS Policies and Database Integrity
BEGIN;

-- ================================
-- 1. STRENGTHEN PROFILES RLS POLICIES
-- ================================

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Create hardened RLS policies
CREATE POLICY "profile_self_read"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "profile_self_update"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profile_self_insert"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ================================
-- 2. ADD DATABASE CONSTRAINTS
-- ================================

-- Add unique constraint for username (case-insensitive)
DO $$
BEGIN
  -- Check if the index already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND indexname = 'unique_username_lower'
  ) THEN
    CREATE UNIQUE INDEX unique_username_lower ON public.profiles (LOWER(username));
  END IF;
END$$;

-- Add email format validation constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'valid_email_format'
    AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT valid_email_format 
      CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
  END IF;
END$$;

-- Add display name length constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'display_name_length'
    AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT display_name_length 
      CHECK (char_length(display_name) >= 1 AND char_length(display_name) <= 50);
  END IF;
END$$;

-- Add username format constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'username_format'
    AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT username_format 
      CHECK (username ~* '^[a-zA-Z0-9_]{3,20}$');
  END IF;
END$$;

-- ================================
-- 3. PERFORMANCE INDEXES
-- ================================

-- Index for username lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Index for user_id foreign key
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

-- ================================
-- 4. STORAGE POLICIES FOR AVATARS
-- ================================

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy for users to read their own avatars
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can read their own avatars'
    AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Users can read their own avatars"
      ON storage.objects
      FOR SELECT
      USING (
        bucket_id = 'avatars' 
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END$$;

-- Policy for users to upload their own avatars
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can upload their own avatars'
    AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Users can upload their own avatars"
      ON storage.objects
      FOR INSERT
      WITH CHECK (
        bucket_id = 'avatars' 
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END$$;

-- Policy for users to update their own avatars
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can update their own avatars'
    AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Users can update their own avatars"
      ON storage.objects
      FOR UPDATE
      USING (
        bucket_id = 'avatars' 
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END$$;

-- Policy for users to delete their own avatars
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users can delete their own avatars'
    AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Users can delete their own avatars"
      ON storage.objects
      FOR DELETE
      USING (
        bucket_id = 'avatars' 
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END$$;

-- ================================
-- 5. AUDIT AND MONITORING SETUP
-- ================================

-- Function to log profile changes
CREATE OR REPLACE FUNCTION public.log_profile_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert audit log (you can create an audit table if needed)
  RAISE LOG 'Profile updated: user_id=%, field=%, old_value=%, new_value=%', 
    NEW.user_id, TG_ARGV[0], OLD, NEW;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for profile audit logging
DROP TRIGGER IF EXISTS profile_audit_trigger ON public.profiles;
CREATE TRIGGER profile_audit_trigger
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_profile_changes();

COMMIT;