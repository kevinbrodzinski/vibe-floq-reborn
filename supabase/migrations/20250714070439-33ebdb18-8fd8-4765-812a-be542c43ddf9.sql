-- Fix enum default to ensure it matches enum literal exactly
ALTER TABLE public.user_settings 
ALTER COLUMN preferred_welcome_template 
SET DEFAULT 'casual-hangout';