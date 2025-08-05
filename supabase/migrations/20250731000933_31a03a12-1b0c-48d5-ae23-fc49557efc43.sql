-- Add unique constraint on profile_id to support ON CONFLICT operations
ALTER TABLE public.user_preferences 
ADD CONSTRAINT user_preferences_profile_id_unique 
UNIQUE (profile_id);