-- ====================================================================
-- FIX FRIEND_SHARE_PREF TABLE STRUCTURE
-- Migration: 20250109000002
-- Description: Ensures friend_share_pref table has correct columns and structure
--              for location sharing functionality
-- ====================================================================

BEGIN;

-- ====================================================================
-- 1. ENSURE FRIEND_SHARE_PREF TABLE EXISTS WITH CORRECT STRUCTURE
-- ====================================================================

-- Create the table if it doesn't exist, or modify if it does
CREATE TABLE IF NOT EXISTS public.friend_share_pref (
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  other_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_live boolean NOT NULL DEFAULT false,
  ends_at timestamptz DEFAULT NULL,
  auto_when text[] DEFAULT ARRAY['always']::text[],
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (profile_id, other_profile_id)
);

-- Handle legacy column names if they exist
DO $$
BEGIN
  -- Check if user_id column exists and rename to profile_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'friend_share_pref' 
    AND column_name = 'user_id'
  ) THEN
    -- Drop existing constraints that might reference user_id
    ALTER TABLE public.friend_share_pref DROP CONSTRAINT IF EXISTS friend_share_pref_pkey CASCADE;
    
    -- Rename the column
    ALTER TABLE public.friend_share_pref RENAME COLUMN user_id TO profile_id;
    
    -- Recreate primary key with correct column name
    ALTER TABLE public.friend_share_pref ADD PRIMARY KEY (profile_id, other_profile_id);
  END IF;

  -- Check if friend_id column exists and rename to other_profile_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'friend_share_pref' 
    AND column_name = 'friend_id'
  ) THEN
    ALTER TABLE public.friend_share_pref RENAME COLUMN friend_id TO other_profile_id;
  END IF;

  -- Add missing columns if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'friend_share_pref' 
    AND column_name = 'ends_at'
  ) THEN
    ALTER TABLE public.friend_share_pref ADD COLUMN ends_at timestamptz DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'friend_share_pref' 
    AND column_name = 'auto_when'
  ) THEN
    ALTER TABLE public.friend_share_pref ADD COLUMN auto_when text[] DEFAULT ARRAY['always']::text[];
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'friend_share_pref' 
    AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.friend_share_pref ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
END $$;

-- ====================================================================
-- 2. ENSURE PROPER FOREIGN KEY CONSTRAINTS
-- ====================================================================

-- Drop existing foreign key constraints to recreate them properly
ALTER TABLE public.friend_share_pref DROP CONSTRAINT IF EXISTS friend_share_pref_profile_id_fkey;
ALTER TABLE public.friend_share_pref DROP CONSTRAINT IF EXISTS friend_share_pref_other_profile_id_fkey;

-- Add proper foreign key constraints
ALTER TABLE public.friend_share_pref 
  ADD CONSTRAINT friend_share_pref_profile_id_fkey 
  FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.friend_share_pref 
  ADD CONSTRAINT friend_share_pref_other_profile_id_fkey 
  FOREIGN KEY (other_profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- ====================================================================
-- 3. ROW LEVEL SECURITY
-- ====================================================================

-- Enable RLS if not already enabled
ALTER TABLE public.friend_share_pref ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can manage their own sharing preferences" ON public.friend_share_pref;
DROP POLICY IF EXISTS "Users can view sharing preferences where they are involved" ON public.friend_share_pref;
DROP POLICY IF EXISTS "me_only" ON public.friend_share_pref;
DROP POLICY IF EXISTS "owner_rw" ON public.friend_share_pref;

-- Create comprehensive RLS policies
CREATE POLICY "Users can manage their own sharing preferences"
  ON public.friend_share_pref
  FOR ALL
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can view preferences where they are the target"
  ON public.friend_share_pref
  FOR SELECT
  USING (other_profile_id = auth.uid());

-- ====================================================================
-- 4. INDEXES FOR PERFORMANCE
-- ====================================================================

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_friend_share_pref_profile_id 
  ON public.friend_share_pref(profile_id);

CREATE INDEX IF NOT EXISTS idx_friend_share_pref_other_profile_id 
  ON public.friend_share_pref(other_profile_id);

CREATE INDEX IF NOT EXISTS idx_friend_share_pref_is_live 
  ON public.friend_share_pref(is_live) 
  WHERE is_live = true;

CREATE INDEX IF NOT EXISTS idx_friend_share_pref_ends_at 
  ON public.friend_share_pref(ends_at) 
  WHERE ends_at IS NOT NULL;

-- ====================================================================
-- 5. HELPER FUNCTIONS
-- ====================================================================

-- Function to get friends who are sharing location with the current user
CREATE OR REPLACE FUNCTION public.get_friends_sharing_with_me()
RETURNS TABLE(
  friend_id uuid,
  is_live boolean,
  ends_at timestamptz,
  auto_when text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    fsp.profile_id AS friend_id,
    fsp.is_live,
    fsp.ends_at,
    fsp.auto_when
  FROM public.friend_share_pref fsp
  WHERE fsp.other_profile_id = auth.uid()
    AND fsp.is_live = true
    AND (fsp.ends_at IS NULL OR fsp.ends_at > now());
$$;

-- Function to get friends that current user is sharing location with
CREATE OR REPLACE FUNCTION public.get_friends_i_am_sharing_with()
RETURNS TABLE(
  friend_id uuid,
  is_live boolean,
  ends_at timestamptz,
  auto_when text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    fsp.other_profile_id AS friend_id,
    fsp.is_live,
    fsp.ends_at,
    fsp.auto_when
  FROM public.friend_share_pref fsp
  WHERE fsp.profile_id = auth.uid()
    AND fsp.is_live = true
    AND (fsp.ends_at IS NULL OR fsp.ends_at > now());
$$;

-- ====================================================================
-- 6. GRANTS AND PERMISSIONS
-- ====================================================================

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.friend_share_pref TO authenticated;

-- Grant execute permissions on helper functions
REVOKE EXECUTE ON FUNCTION public.get_friends_sharing_with_me() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_friends_sharing_with_me() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_friends_i_am_sharing_with() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_friends_i_am_sharing_with() TO authenticated;

-- ====================================================================
-- 7. COMMENTS
-- ====================================================================

COMMENT ON TABLE public.friend_share_pref IS 
  'Location sharing preferences between friends with temporal controls';

COMMENT ON COLUMN public.friend_share_pref.profile_id IS 
  'User who owns this sharing preference';

COMMENT ON COLUMN public.friend_share_pref.other_profile_id IS 
  'Friend who this preference applies to';

COMMENT ON COLUMN public.friend_share_pref.is_live IS 
  'Whether location sharing is currently active';

COMMENT ON COLUMN public.friend_share_pref.ends_at IS 
  'When location sharing should automatically stop (NULL = indefinite)';

COMMENT ON COLUMN public.friend_share_pref.auto_when IS 
  'Conditions when location should be automatically shared (always, at_venue, in_floq, etc.)';

COMMENT ON FUNCTION public.get_friends_sharing_with_me() IS 
  'Returns friends who are currently sharing their location with the calling user';

COMMENT ON FUNCTION public.get_friends_i_am_sharing_with() IS 
  'Returns friends that the calling user is currently sharing location with';

COMMIT;