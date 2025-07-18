-- Add field visualization settings to user_settings table
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS field_ripples BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS field_trails BOOLEAN DEFAULT true;