-- Add vibe detection preference column for cross-device sync
ALTER TABLE public.user_preferences 
ADD COLUMN vibe_detection_enabled boolean DEFAULT false;