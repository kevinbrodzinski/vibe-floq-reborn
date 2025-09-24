-- Drop old RLS policy that may reference outdated column names
DROP POLICY IF EXISTS "friends_rw" ON public.friendships;

-- Create correct RLS policy on friendships table
CREATE POLICY "friendships_user_access" ON public.friendships
  FOR ALL
  USING (
    auth.uid() IS NOT NULL AND (
      user_id = auth.uid() OR friend_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND (
      user_id = auth.uid() OR friend_id = auth.uid()
    )
  );

-- Add indexes for performance (friendship lookups + presence joins)
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON public.friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON public.friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_user_vibe_states_user_active ON public.user_vibe_states(user_id) WHERE active;

-- Drop and recreate public read policy for profiles (safe access only)
DROP POLICY IF EXISTS "profiles_public_read" ON public.profiles;

CREATE POLICY "profiles_public_read" ON public.profiles
  FOR SELECT
  USING (true);

-- Ensure authenticated role can execute the friend presence helper function
GRANT EXECUTE ON FUNCTION public.get_friends_with_presence() TO authenticated;