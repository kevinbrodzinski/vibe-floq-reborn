-- Enforce username requirement with proper safeguards
-- This migration makes username NOT NULL with proper back-filling and constraints

-- 0. Temporarily rename existing unique index while we back-fill
ALTER INDEX IF EXISTS profiles_username_lower_idx RENAME TO profiles_username_lower_idx_old;

-- 1. Back-fill any NULL or empty usernames with safe defaults
UPDATE public.profiles
SET    username = 'user_' || substr(id::text, 1, 8)
WHERE  username IS NULL
   OR  length(trim(username)) = 0;

-- 2. Enforce NOT NULL constraint
ALTER TABLE public.profiles
  ALTER COLUMN username SET NOT NULL;

-- 3. Add format constraint - only allow safe characters and non-blank
ALTER TABLE public.profiles
  ADD CONSTRAINT username_format_chk
      CHECK ( username ~ '^[A-Za-z0-9_.-]+$' );

-- 4. Recreate case-insensitive unique index concurrently
CREATE UNIQUE INDEX CONCURRENTLY profiles_username_lower_idx
  ON public.profiles ( lower(username) );

-- 5. Drop old index
DROP INDEX IF EXISTS profiles_username_lower_idx_old;

-- 6. Update trigger to handle new user creation with proper username logic
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  username text;
BEGIN
  -- Extract and clean username from metadata, fallback to generated username
  username := lower(trim(coalesce(
    NEW.raw_user_meta_data ->> 'username',
    NEW.raw_user_meta_data ->> 'user_name', 
    'user_' || substr(NEW.id::text, 1, 8)
  )));
  
  -- Ensure username meets format requirements
  IF username !~ '^[A-Za-z0-9_.-]+$' THEN
    username := 'user_' || substr(NEW.id::text, 1, 8);
  END IF;
  
  -- Insert profile with guaranteed valid username
  INSERT INTO public.profiles (
    id, 
    username, 
    display_name
  ) VALUES (
    NEW.id,
    username,
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      username
    )
  );
  
  RETURN NEW;
END;
$$;