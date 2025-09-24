-- Enhanced Location Sharing System
-- Adds comprehensive location sharing controls with smart features

-- ENUM helpers
CREATE TYPE scope_enum AS ENUM ('friends','mutuals','none');
CREATE TYPE acc_enum AS ENUM ('exact','street','area');

-- Add new columns to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS live_scope       scope_enum DEFAULT 'friends',
  ADD COLUMN IF NOT EXISTS live_auto_when   text[]     DEFAULT ARRAY['always'],
  ADD COLUMN IF NOT EXISTS live_accuracy    acc_enum   DEFAULT 'exact',
  ADD COLUMN IF NOT EXISTS live_muted_until timestamptz,
  ADD COLUMN IF NOT EXISTS live_smart_flags jsonb      DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.live_muted_until IS
  'Temporarily disables live sharing until this timestamp';

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_profiles_live_scope ON public.profiles(live_scope);
CREATE INDEX IF NOT EXISTS idx_profiles_live_muted_until ON public.profiles(live_muted_until);
CREATE INDEX IF NOT EXISTS idx_profiles_live_auto_when ON public.profiles USING GIN(live_auto_when); 