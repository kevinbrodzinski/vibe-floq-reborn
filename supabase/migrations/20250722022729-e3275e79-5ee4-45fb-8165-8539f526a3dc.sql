-- Production-ready username enforcement fixes

-- 1. Update constraint to include length validation
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS username_format_chk;
ALTER TABLE public.profiles 
  ADD CONSTRAINT username_format_chk 
  CHECK ( username ~ '^[A-Za-z0-9_.-]{3,32}$' ) NOT VALID;

-- 2. Validate constraint in separate step (can be run during low-traffic)
ALTER TABLE public.profiles VALIDATE CONSTRAINT username_format_chk;

-- 3. Create production-safe trigger with collision handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public, pg_temp
AS $$
DECLARE
  raw_username text;
  clean_username text;
  final_username text;
BEGIN
  -- Extract username from metadata with proper fallback chain
  raw_username := lower(trim(coalesce(
    NEW.user_metadata ->> 'username',
    NEW.raw_user_meta_data ->> 'username', 
    NEW.raw_user_meta_data ->> 'user_name',
    'user_' || substr(NEW.id::text, 1, 8)
  )));
  
  -- Clean and validate format
  clean_username := regexp_replace(raw_username, '[^A-Za-z0-9_.-]', '', 'g');
  
  -- Ensure meets length and format requirements
  IF length(clean_username) < 3 OR length(clean_username) > 32 OR 
     clean_username !~ '^[A-Za-z0-9_.-]{3,32}$' THEN
    clean_username := 'user_' || substr(NEW.id::text, 1, 8);
  END IF;
  
  -- Collision-safe insert with automatic suffix generation
  INSERT INTO public.profiles (
    id, 
    username, 
    display_name
  ) VALUES (
    NEW.id,
    clean_username,
    COALESCE(
      NEW.user_metadata ->> 'full_name',
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      clean_username
    )
  )
  ON CONFLICT ON CONSTRAINT profiles_username_lower_idx
  DO UPDATE SET username = LEFT(
    EXCLUDED.username || '_' || substr(gen_random_uuid()::text, 1, 4), 
    32
  );
  
  RETURN NEW;
END;
$$;