-- Check and fix RLS policies for friendships table
-- The friendships table uses user_id/friend_id but current policy references user_a/user_b

-- Drop old policy if it exists with wrong column names
DROP POLICY IF EXISTS "friends_rw" ON public.friendships;

-- Create correct RLS policy for friendships table
CREATE POLICY "friendships_user_access" ON public.friendships
  FOR ALL
  USING ((auth.uid() IS NOT NULL) AND ((user_id = auth.uid()) OR (friend_id = auth.uid())))
  WITH CHECK ((auth.uid() IS NOT NULL) AND ((user_id = auth.uid()) OR (friend_id = auth.uid())));

-- Add performance indexes for the new function
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON public.friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON public.friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_user_vibe_states_user_active ON public.user_vibe_states(user_id) WHERE active;

-- Ensure profiles has public read access (already exists but making sure)
CREATE POLICY IF NOT EXISTS "profiles_public_read" ON public.profiles
  FOR SELECT
  USING (true);

-- Grant execute permission for the function (should already exist but ensuring)
GRANT EXECUTE ON FUNCTION public.get_friends_with_presence() TO authenticated;