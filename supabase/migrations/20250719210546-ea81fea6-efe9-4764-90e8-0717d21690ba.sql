
-- Add onboarding tracking columns to user_preferences table
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS onboarding_version TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS prefer_smart_suggestions BOOLEAN DEFAULT true;

-- Update existing users to mark them as having completed onboarding
-- so they don't see the onboarding flow
UPDATE public.user_preferences 
SET onboarding_version = 'v1', 
    onboarding_completed_at = now()
WHERE onboarding_version IS NULL;
