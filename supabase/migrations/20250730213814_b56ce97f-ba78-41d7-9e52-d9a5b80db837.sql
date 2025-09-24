-- Security Hardening Phase 1: Critical RLS and Policy Fixes
BEGIN;

-- ================================
-- 1. PROFILES TABLE - CLEAN UP DUPLICATE POLICIES
-- ================================

-- Use conditional drops to avoid errors
DO $$
BEGIN
  -- Drop all existing conflicting policies
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profile_self_read') THEN
    DROP POLICY "profile_self_read" ON public.profiles;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profile_self_update') THEN
    DROP POLICY "profile_self_update" ON public.profiles;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profile_self_insert') THEN
    DROP POLICY "profile_self_insert" ON public.profiles;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_insert_owner') THEN
    DROP POLICY "profiles_insert_owner" ON public.profiles;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_select_owner') THEN
    DROP POLICY "profiles_select_owner" ON public.profiles;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_update_owner') THEN
    DROP POLICY "profiles_update_owner" ON public.profiles;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_self_insert') THEN
    DROP POLICY "profiles_self_insert" ON public.profiles;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_self_select') THEN
    DROP POLICY "profiles_self_select" ON public.profiles;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_self_update') THEN
    DROP POLICY "profiles_self_update" ON public.profiles;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'self-profile-access') THEN
    DROP POLICY "self-profile-access" ON public.profiles;
  END IF;
END $$;

-- Create clean, secure policies using correct column name (id)
CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "profiles_insert_own"
  ON public.profiles
  FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Note: Keep p_public_profiles and profiles_public_read for public visibility

-- ================================
-- 2. ENABLE RLS ON CHAT TABLES
-- ================================

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_message_reactions ENABLE ROW LEVEL SECURITY;

-- ================================
-- 3. CHAT MESSAGE POLICIES
-- ================================

-- Secure chat message policies
CREATE POLICY "chat_messages_participant_access"
  ON public.chat_messages
  FOR ALL
  USING (
    sender_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM floq_participants fp
      WHERE fp.floq_id = (
        SELECT floq_id FROM floqs f WHERE f.id = chat_messages.thread_id
      ) AND fp.profile_id = auth.uid()
    )
  )
  WITH CHECK (sender_id = auth.uid());

-- No updates allowed on reactions (immutable)
CREATE POLICY "chat_reactions_no_update"
  ON public.chat_message_reactions
  FOR UPDATE
  USING (false);

-- Reactions: participants can add/remove their own
CREATE POLICY "chat_reactions_participant_manage"
  ON public.chat_message_reactions
  FOR ALL
  USING (
    reactor_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM chat_messages cm
      JOIN floq_participants fp ON fp.floq_id = (
        SELECT floq_id FROM floqs f WHERE f.id = cm.thread_id
      )
      WHERE cm.id = chat_message_reactions.message_id
      AND fp.profile_id = auth.uid()
    )
  )
  WITH CHECK (
    reactor_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM chat_messages cm
      JOIN floq_participants fp ON fp.floq_id = (
        SELECT floq_id FROM floqs f WHERE f.id = cm.thread_id
      )
      WHERE cm.id = chat_message_reactions.message_id
      AND fp.profile_id = auth.uid()
    )
  );

-- ================================
-- 4. SECURITY DEFINER FUNCTION FOR ROLE CHECKING
-- ================================

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
BEGIN
  SET LOCAL row_security = on;
  
  RETURN (
    SELECT role 
    FROM public.profiles 
    WHERE id = auth.uid() 
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ================================
-- 5. STORAGE SECURITY HARDENING
-- ================================

-- Drop existing avatar policies safely
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can read their own avatars') THEN
    DROP POLICY "Users can read their own avatars" ON storage.objects;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can upload their own avatars') THEN
    DROP POLICY "Users can upload their own avatars" ON storage.objects;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can update their own avatars') THEN
    DROP POLICY "Users can update their own avatars" ON storage.objects;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can delete their own avatars') THEN
    DROP POLICY "Users can delete their own avatars" ON storage.objects;
  END IF;
END $$;

-- Create secure avatar storage policies with proper file validation
CREATE POLICY "avatars_public_read"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_user_upload"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND lower(name) ~ '\.(png|jpe?g|gif|webp)$'
  );

CREATE POLICY "avatars_user_update"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "avatars_user_delete"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

COMMIT;