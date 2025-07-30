-- Fix onboarding database constraints - more permissive approach

-- 1. Drop the conflicting avatar constraint that requires non-null avatar_url
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_avatar_required;

-- 2. Remove conflicting username constraints but be more permissive
DO $$ 
BEGIN
    -- Drop old constraints if they exist
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_username_check') THEN
        ALTER TABLE public.profiles DROP CONSTRAINT profiles_username_check;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'username_format') THEN
        ALTER TABLE public.profiles DROP CONSTRAINT username_format;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'username_not_reserved') THEN
        ALTER TABLE public.profiles DROP CONSTRAINT username_not_reserved;
    END IF;
END $$;

-- 3. Create a more permissive username validation that works with existing data
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_username_basic 
CHECK (
    username IS NOT NULL 
    AND length(username) >= 2  -- More permissive length
    AND length(username) <= 50 -- More permissive length
    AND username !~ '[[:space:]]' -- No spaces allowed
);

-- 4. Ensure case-insensitive unique constraint on username
DROP INDEX IF EXISTS profiles_username_unique_idx;
CREATE UNIQUE INDEX profiles_username_unique_idx ON public.profiles (LOWER(username));

-- 5. Make sure avatar_url has proper default and can be empty string
ALTER TABLE public.profiles 
ALTER COLUMN avatar_url SET DEFAULT '';

-- Update any null avatar_url values to empty string
UPDATE public.profiles 
SET avatar_url = '' 
WHERE avatar_url IS NULL;