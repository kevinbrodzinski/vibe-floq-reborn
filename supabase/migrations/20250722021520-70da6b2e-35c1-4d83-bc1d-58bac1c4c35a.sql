-- Enforce username requirement - Part 1: Prepare and back-fill
-- This migration prepares for username NOT NULL enforcement

-- 1. Drop existing unique index temporarily
DROP INDEX IF EXISTS profiles_username_lower_idx;

-- 2. Back-fill any NULL or empty usernames with safe defaults
UPDATE public.profiles
SET    username = 'user_' || substr(id::text, 1, 8)
WHERE  username IS NULL
   OR  length(trim(username)) = 0;

-- 3. Enforce NOT NULL constraint
ALTER TABLE public.profiles
  ALTER COLUMN username SET NOT NULL;

-- 4. Add format constraint - only allow safe characters and non-blank
ALTER TABLE public.profiles
  ADD CONSTRAINT username_format_chk
      CHECK ( username ~ '^[A-Za-z0-9_.-]+$' );

-- 5. Create regular unique index (will recreate as concurrent in next migration)
CREATE UNIQUE INDEX profiles_username_lower_idx
  ON public.profiles ( lower(username) );

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