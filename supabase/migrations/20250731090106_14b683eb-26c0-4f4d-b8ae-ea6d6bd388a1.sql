-- Add unique constraint to user_settings table to support upsert operations
ALTER TABLE public.user_settings 
ADD CONSTRAINT user_settings_profile_id_unique UNIQUE (profile_id);