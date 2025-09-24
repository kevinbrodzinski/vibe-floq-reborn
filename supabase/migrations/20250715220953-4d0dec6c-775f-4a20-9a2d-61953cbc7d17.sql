-- Drop and recreate the function with correct return type
DROP FUNCTION IF EXISTS public.get_friends_with_presence();

CREATE OR REPLACE FUNCTION public.get_friends_with_presence()
RETURNS TABLE (
  friend_id     uuid,
  display_name  text,
  avatar_url    text,
  username      citext,
  vibe_tag      vibe_enum,
  started_at    timestamptz,
  online        boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    f.friend                       AS friend_id,
    p.display_name,
    p.avatar_url,
    p.username,
    f.vibe_tag,
    f.started_at,
    true                           -- friend_presence already filters last 90 min
  FROM friend_presence f
  JOIN profiles p ON p.id = f.friend
  WHERE f.me = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_friends_with_presence() TO authenticated;