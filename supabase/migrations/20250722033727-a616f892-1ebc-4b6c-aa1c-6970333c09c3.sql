
-- Phase 0: Add field_enabled toggle for safe rollout of experimental Field view
-- This allows us to ship incrementally and enable only for beta testers

ALTER TABLE public.user_preferences 
ADD COLUMN field_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.user_preferences.field_enabled IS 
  'If true, user can access the experimental WebGL Field map (beta). Default false for safe rollout.';

-- No RLS changes needed - user_preferences already has proper row-level security
-- Users can only see/modify their own preferences row
