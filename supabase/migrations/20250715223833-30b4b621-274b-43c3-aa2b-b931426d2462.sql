-- Drop the broken function (based on friend_presence view)
DROP FUNCTION IF EXISTS public.get_friends_with_presence();

-- Create the corrected function using friendships table directly
CREATE OR REPLACE FUNCTION public.get_friends_with_presence()
RETURNS TABLE (
  friend_id uuid,
  username citext,
  avatar_url text,
  display_name text,
  vibe_tag vibe_enum,
  started_at timestamptz,
  online boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN f.user_id = auth.uid() THEN f.friend_id
      ELSE f.user_id
    END as friend_id,
    p.username,
    p.avatar_url,
    p.display_name,
    uvs.vibe_tag,
    uvs.started_at,
    (uvs.active AND uvs.started_at > now() - interval '2 hours') as online
  FROM friendships f
  JOIN profiles p ON
    p.id = CASE
      WHEN f.user_id = auth.uid() THEN f.friend_id
      ELSE f.user_id
    END
  LEFT JOIN user_vibe_states uvs ON uvs.user_id = p.id AND uvs.active
  WHERE
    f.user_id = auth.uid() OR f.friend_id = auth.uid();
$$;

-- Ensure RLS on friendships and profiles is correct
DROP POLICY IF EXISTS "friendships_user_access" ON public.friendships;
CREATE POLICY "friendships_user_access" ON public.friendships
  FOR ALL
  USING (
    auth.uid() IS NOT NULL AND (user_id = auth.uid() OR friend_id = auth.uid())
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND (user_id = auth.uid() OR friend_id = auth.uid())
  );

DROP POLICY IF EXISTS "profiles_public_read" ON public.profiles;
CREATE POLICY "profiles_public_read" ON public.profiles
  FOR SELECT
  USING (true);

-- Required read policy on user_vibe_states for presence to show
DROP POLICY IF EXISTS "presence_read" ON public.user_vibe_states;
CREATE POLICY "presence_read" ON public.user_vibe_states
  FOR SELECT USING (true);

-- Indexes for better friend and presence lookup
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON public.friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON public.friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_user_vibe_states_user_active ON public.user_vibe_states(user_id) WHERE active;

-- Grant execution rights to authenticated users
GRANT EXECUTE ON FUNCTION public.get_friends_with_presence() TO authenticated;