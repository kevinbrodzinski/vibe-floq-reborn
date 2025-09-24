-- Fix RLS policies and permissions for friend sharing system
BEGIN;

-- Fix friendships table RLS policies to use correct column names
DROP POLICY IF EXISTS "Users can view friendship relationships" ON public.friendships;
DROP POLICY IF EXISTS "Friends can view each other's relationships" ON public.friendships;

CREATE POLICY "Users can view their own friendship relationships" 
ON public.friendships FOR SELECT 
USING (auth.uid() IN (user_low, user_high));

-- Fix venue_live_presence RLS policies
DROP POLICY IF EXISTS "Users can view venue presence" ON public.venue_live_presence;
DROP POLICY IF EXISTS "Users can manage their own venue presence" ON public.venue_live_presence;

CREATE POLICY "Users can view their own venue presence" 
ON public.venue_live_presence FOR SELECT 
USING (profile_id = auth.uid());

CREATE POLICY "Users can insert their own venue presence" 
ON public.venue_live_presence FOR INSERT 
WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can update their own venue presence" 
ON public.venue_live_presence FOR UPDATE 
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can delete their own venue presence" 
ON public.venue_live_presence FOR DELETE 
USING (profile_id = auth.uid());

-- Fix presence table RLS policies
DROP POLICY IF EXISTS "Users can view presence data" ON public.presence;
DROP POLICY IF EXISTS "Users can manage their own presence" ON public.presence;

CREATE POLICY "Users can view their own presence" 
ON public.presence FOR SELECT 
USING (profile_id = auth.uid());

CREATE POLICY "Users can insert their own presence" 
ON public.presence FOR INSERT 
WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can update their own presence" 
ON public.presence FOR UPDATE 
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can delete their own presence" 
ON public.presence FOR DELETE 
USING (profile_id = auth.uid());

-- Ensure friend_share_pref table has proper RLS
DROP POLICY IF EXISTS "Users can manage their own share preferences" ON public.friend_share_pref;

CREATE POLICY "Users can view their own share preferences" 
ON public.friend_share_pref FOR SELECT 
USING (profile_id = auth.uid());

CREATE POLICY "Users can insert their own share preferences" 
ON public.friend_share_pref FOR INSERT 
WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can update their own share preferences" 
ON public.friend_share_pref FOR UPDATE 
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can delete their own share preferences" 
ON public.friend_share_pref FOR DELETE 
USING (profile_id = auth.uid());

COMMIT;