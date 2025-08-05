-- Add preferred_vibe column to user_preferences if it doesn't exist
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS preferred_vibe TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.user_preferences.preferred_vibe IS 'User''s primary vibe preference set during onboarding';