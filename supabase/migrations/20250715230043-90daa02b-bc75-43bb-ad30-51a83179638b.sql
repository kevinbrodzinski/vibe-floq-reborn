-- Drop all get_user_by_username functions by specific signatures
DROP FUNCTION IF EXISTS public.get_user_by_username(citext);
DROP FUNCTION IF EXISTS public.get_user_by_username(text);
DROP FUNCTION IF EXISTS public.get_user_by_username(lookup_username citext);
DROP FUNCTION IF EXISTS public.get_user_by_username(lookup_username text);

-- Create the one canonical version
CREATE OR REPLACE FUNCTION public.get_user_by_username(lookup_username text)
RETURNS TABLE (
  id           uuid,
  username     citext,
  display_name text,
  avatar_url   text,
  bio          text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $func$
  SELECT
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.bio
  FROM public.profiles p
  WHERE lower(p.username::text) = lower(lookup_username)
  LIMIT 1;
$func$;

-- Grant execution rights
GRANT EXECUTE ON FUNCTION public.get_user_by_username(text) TO anon, authenticated;