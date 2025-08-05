-- 0️⃣ ensure citext exists (harmless if already installed)
CREATE EXTENSION IF NOT EXISTS citext;

-- 1️⃣ drop old version if re-running migration
DROP FUNCTION IF EXISTS public.get_friends_with_presence(uuid);

-- 2️⃣ recreate, forcing UID to caller
CREATE OR REPLACE FUNCTION public.get_friends_with_presence()
RETURNS TABLE (
  friend_id    uuid,
  display_name text,
  avatar_url   text,
  username     citext,
  bio          text,
  vibe_tag     vibe_enum,
  started_at   timestamptz,
  online       boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
STRICT                           -- returns 0 rows if auth.uid() is NULL
SET search_path = public, pg_temp
AS $$
  SELECT
    fp.friend                                AS friend_id,
    pr.display_name,
    pr.avatar_url,
    pr.username,
    pr.bio,
    fp.vibe_tag,
    fp.started_at,
    (fp.started_at IS NOT NULL
     AND fp.started_at > now() - interval '2 hours') AS online
  FROM   public.friend_presence fp
  JOIN   public.profiles pr ON pr.id = fp.friend
  WHERE  fp.me = auth.uid()                    -- 🔒 caller only
$$;

-- 3️⃣ runtime privilege
GRANT EXECUTE ON FUNCTION public.get_friends_with_presence() TO authenticated;