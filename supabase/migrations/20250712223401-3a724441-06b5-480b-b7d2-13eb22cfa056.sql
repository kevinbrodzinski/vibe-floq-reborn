-- Apply schema hardening tweaks based on citext compatibility review

-- 1. Update get_user_by_username to be STABLE SQL function for better performance
CREATE OR REPLACE FUNCTION public.get_user_by_username(lookup_username citext)
RETURNS TABLE (
  id          uuid,
  username    citext,
  display_name text,
  avatar_url  text,
  created_at  timestamptz
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = 'public', 'pg_temp'
AS $$
  SELECT id, username, display_name, avatar_url, created_at
  FROM   profiles
  WHERE  username = lookup_username
  LIMIT  1;
$$;

-- 2. Update username_available to be STABLE SQL function
CREATE OR REPLACE FUNCTION public.username_available(u citext)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = 'public', 'pg_temp'
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM profiles WHERE username = u
    UNION ALL
    SELECT 1 FROM reserved_usernames WHERE name = u
  );
$$;

-- 3. Update attempt_claim_username with auth.uid() NULL guard and single UPSERT
CREATE OR REPLACE FUNCTION public.attempt_claim_username(desired citext)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
DECLARE
  current_user_id uuid;
  normalized_username citext;
BEGIN
  -- Guard against NULL auth.uid()
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;

  -- Normalize input: trim whitespace and convert to lowercase
  normalized_username := LOWER(TRIM(desired::text))::citext;
  
  -- Validate format (3-32 alphanumeric plus underscore)
  IF NOT (normalized_username ~ '^[a-z0-9_]{3,32}$') THEN
    RETURN false;
  END IF;

  -- Single-statement UPSERT with conflict handling
  INSERT INTO profiles (id, username)
  VALUES (current_user_id, normalized_username)
  ON CONFLICT (id) DO UPDATE SET username = EXCLUDED.username
  WHERE profiles.username IS NULL OR profiles.username = '';
  
  -- Check if update was successful (no constraint violations)
  RETURN FOUND;
  
EXCEPTION
  WHEN unique_violation THEN
    RETURN false;
  WHEN check_violation THEN  
    RETURN false;
END;
$$;

-- 4. Grant EXECUTE permissions back to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_by_username(citext) TO authenticated;
GRANT EXECUTE ON FUNCTION public.username_available(citext) TO authenticated;
GRANT EXECUTE ON FUNCTION public.attempt_claim_username(citext) TO authenticated;