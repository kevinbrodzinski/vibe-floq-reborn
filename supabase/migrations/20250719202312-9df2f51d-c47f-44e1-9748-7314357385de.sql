-- ===============================================
-- Update RLS for Unified Edge Functions
-- Remove references to old function names
-- ===============================================

-- Update RLS policies to support unified edge functions
-- Drop any policies that might reference old function names
DROP POLICY IF EXISTS "old_update_user_settings" ON public.user_settings;
DROP POLICY IF EXISTS "old_floq_boost_policy" ON public.floq_boosts;
DROP POLICY IF EXISTS "old_invite_policy" ON public.floq_invitations;
DROP POLICY IF EXISTS "old_mention_policy" ON public.user_notifications;

-- Ensure user_settings RLS works with update-settings unified function
CREATE POLICY "unified_user_settings_policy" ON public.user_settings
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Ensure user_preferences RLS works with update-settings unified function  
CREATE POLICY "unified_user_preferences_policy" ON public.user_preferences
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Ensure floq_settings RLS works with update-settings unified function
CREATE POLICY "unified_floq_settings_policy" ON public.floq_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.floq_participants fp
      WHERE fp.floq_id = floq_settings.floq_id
        AND fp.user_id = auth.uid()
        AND fp.role IN ('creator', 'co-admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.floq_participants fp
      WHERE fp.floq_id = floq_settings.floq_id
        AND fp.user_id = auth.uid()
        AND fp.role IN ('creator', 'co-admin')
    )
  );

-- Ensure floq_boosts RLS works with floq-actions unified function
CREATE POLICY "unified_floq_boosts_policy" ON public.floq_boosts
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Ensure floq_invitations RLS works with send-invitations unified function
CREATE POLICY "unified_floq_invitations_policy" ON public.floq_invitations
  FOR ALL
  USING (
    inviter_id = auth.uid() OR 
    invitee_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.floq_participants fp
      WHERE fp.floq_id = floq_invitations.floq_id
        AND fp.user_id = auth.uid()
        AND fp.role IN ('creator', 'co-admin')
    )
  )
  WITH CHECK (
    inviter_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.floq_participants fp
      WHERE fp.floq_id = floq_invitations.floq_id
        AND fp.user_id = auth.uid()
        AND fp.role IN ('creator', 'co-admin')
    )
  );

-- Ensure venue_live_presence RLS works with get-venue-data unified function
CREATE POLICY "unified_venue_presence_policy" ON public.venue_live_presence
  FOR SELECT
  USING (true); -- Public read for venue data

-- Ensure venue_feed_posts RLS works with get-venue-data unified function
CREATE POLICY "unified_venue_feed_policy" ON public.venue_feed_posts
  FOR SELECT
  USING (expires_at > now()); -- Only show non-expired posts

-- Ensure user_notifications RLS works with floq-actions unified function
CREATE POLICY "unified_notifications_policy" ON public.user_notifications
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Grant execute permissions for unified edge functions
GRANT EXECUTE ON FUNCTION public.call_update_settings(text, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.call_floq_actions(text, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.call_send_invitations(text, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.call_generate_intelligence(text, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.call_get_venue_data(text, jsonb) TO authenticated, service_role;

-- Clean up any orphaned policies that might reference old function names
DROP POLICY IF EXISTS "legacy_afterglow_policy" ON public.daily_afterglow;
DROP POLICY IF EXISTS "legacy_plan_policy" ON public.floq_plans;
DROP POLICY IF EXISTS "legacy_venue_policy" ON public.venues;