
-- Username MVP Migration
-- Add username column, constraints, indexes, and helper functions

-- 1. Add username column (nullable for existing users)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text;

-- 2. Add regex check constraint to prevent malformed usernames
ALTER TABLE public.profiles
  ADD CONSTRAINT chk_username_format
  CHECK (username IS NULL OR username ~* '^[a-z0-9_]{3,32}$');

-- 3. Create case-insensitive unique index for username uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS uniq_profiles_username_ci
  ON public.profiles (lower(username));

-- 4. Helper function to check username availability
CREATE OR REPLACE FUNCTION public.username_available(u text)
RETURNS boolean 
LANGUAGE sql 
STABLE 
SECURITY DEFINER
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE lower(username) = lower(u)
  );
$$;

-- 5. Helper function to claim username atomically
CREATE OR REPLACE FUNCTION public.claim_username(desired text)
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
BEGIN
  -- Validate format
  IF desired !~ '^[a-z0-9_]{3,32}$' THEN
    RAISE EXCEPTION 'Invalid username format. Use 3-32 characters: letters, numbers, underscore only';
  END IF;
  
  -- Check availability
  IF NOT public.username_available(desired) THEN
    RAISE EXCEPTION 'Username "%s" is already taken', desired;
  END IF;
  
  -- Claim it
  UPDATE public.profiles 
  SET username = desired
  WHERE id = auth.uid();
  
  -- Verify the update worked
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to update username. User profile not found.';
  END IF;
END;
$$;

-- 6. Convenience function for single check & claim operation
CREATE OR REPLACE FUNCTION public.attempt_claim_username(desired text)
RETURNS boolean 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
BEGIN
  PERFORM public.claim_username(desired);
  RETURN true;                       -- success
EXCEPTION WHEN OTHERS THEN
  RETURN false;                      -- unavailable or format error
END;
$$;

-- 7. Update search_users function to search both username and display_name
CREATE OR REPLACE FUNCTION public.search_users(search_query text)
RETURNS TABLE(
  id uuid,
  display_name text,
  username text,
  avatar_url text,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    p.id,
    p.display_name,
    p.username,
    p.avatar_url,
    p.created_at
  FROM public.profiles p
  WHERE 
    -- Exact username match (highest priority)
    lower(p.username) = lower(search_query)
    OR
    -- Username starts with query
    lower(p.username) LIKE lower(search_query) || '%'
    OR
    -- Display name similarity
    p.display_name ILIKE '%' || search_query || '%'
    OR
    -- Username contains query
    lower(p.username) LIKE '%' || lower(search_query) || '%'
  ORDER BY
    -- Ranking: exact username match first, then username prefix, then display name, then username contains
    CASE 
      WHEN lower(p.username) = lower(search_query) THEN 1
      WHEN lower(p.username) LIKE lower(search_query) || '%' THEN 2
      WHEN p.display_name ILIKE search_query || '%' THEN 3
      WHEN p.display_name ILIKE '%' || search_query || '%' THEN 4
      WHEN lower(p.username) LIKE '%' || lower(search_query) || '%' THEN 5
      ELSE 6
    END,
    -- Secondary sort by username if available, then display_name
    COALESCE(p.username, p.display_name)
  LIMIT 50;
$$;

-- 8. Create user lookup function for future vanity URLs
CREATE OR REPLACE FUNCTION public.get_user_by_username(lookup_username text)
RETURNS TABLE(
  id uuid,
  display_name text,
  username text,
  avatar_url text,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    id,
    display_name,
    username,
    avatar_url,
    created_at
  FROM public.profiles
  WHERE lower(username) = lower(lookup_username)
  LIMIT 1;
$$;
