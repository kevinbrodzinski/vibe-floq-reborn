-- 1️⃣ Re-expose the username_exists RPC exactly how the front-end calls it

-- Drop any wrong-signature versions first
DROP FUNCTION IF EXISTS public.username_exists(text);
DROP FUNCTION IF EXISTS public.username_exists(citext);

CREATE OR REPLACE FUNCTION public.username_exists(username text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER                    -- ← so it can ignore RLS
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE lower(p.username) = lower(username)
  );
$$;

GRANT EXECUTE ON FUNCTION public.username_exists(text) TO anon, authenticated;

-- 2️⃣ Provide the zero-argument flavour the UI expects for friends

DROP FUNCTION IF EXISTS public.get_friends_with_presence();      -- 0-arg
DROP FUNCTION IF EXISTS public.get_friends_with_presence(uuid);  -- 1-arg

CREATE OR REPLACE FUNCTION public.get_friends_with_presence()
RETURNS SETOF public.friend_presence   -- same columns as the view
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM   public.friend_presence
  WHERE  me = auth.uid();
END; $$;

GRANT EXECUTE ON FUNCTION public.get_friends_with_presence() TO authenticated;