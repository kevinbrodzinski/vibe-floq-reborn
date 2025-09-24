-- Set default value for avatar_url to prevent null crashes
ALTER TABLE public.profiles 
ALTER COLUMN avatar_url SET DEFAULT '';

-- Update existing null values to empty string
UPDATE public.profiles 
SET avatar_url = '' 
WHERE avatar_url IS NULL; 