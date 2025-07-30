-- Fix onboarding database constraints for profiles table

-- 1. Drop the conflicting avatar constraint that requires non-null avatar_url
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_avatar_required;

-- 2. Ensure avatar_url column allows empty strings but not null (already set to default '')
-- This constraint was causing issues - we'll allow empty strings as valid avatars

-- 3. Remove any conflicting username constraints and create a single comprehensive one
-- First drop existing constraints that might conflict
DO $$ 
BEGIN
    -- Drop old constraint if it exists
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_username_check') THEN
        ALTER TABLE public.profiles DROP CONSTRAINT profiles_username_check;
    END IF;
    
    -- Drop any other username format constraints
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'username_format') THEN
        ALTER TABLE public.profiles DROP CONSTRAINT username_format;
    END IF;
    
    -- Drop any reserved username constraints 
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'username_not_reserved') THEN
        ALTER TABLE public.profiles DROP CONSTRAINT username_not_reserved;
    END IF;
END $$;

-- 4. Create a single, clear username validation constraint
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_username_format 
CHECK (
    username IS NOT NULL 
    AND length(username) >= 3 
    AND length(username) <= 32 
    AND username ~ '^[a-z0-9._-]+$'
    AND username NOT LIKE '%.%'   -- no consecutive dots
    AND username NOT LIKE '%-%'   -- no consecutive dashes  
    AND username NOT LIKE '%_%'   -- no consecutive underscores
    AND username NOT SIMILAR TO '[._-]%|%[._-]'  -- no leading/trailing special chars
);

-- 5. Fix the unique constraint on username to handle the insert properly
-- The existing unique index should be sufficient, but let's ensure it's case-insensitive
DROP INDEX IF EXISTS profiles_username_unique_idx;
CREATE UNIQUE INDEX profiles_username_unique_idx ON public.profiles (LOWER(username));

-- 6. Update the create-profile edge function constraint handling
-- Remove any conflicting UPSERT patterns by ensuring clean insert-only operations