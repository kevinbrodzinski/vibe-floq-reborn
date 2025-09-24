-- ===============================================
-- Update RLS for Unified Edge Functions - Clean Version
-- Remove references to old function names and consolidate policies
-- ===============================================

-- Drop any legacy policies that might reference old function names
DROP POLICY IF EXISTS "old_update_user_settings" ON public.user_settings;
DROP POLICY IF EXISTS "old_floq_boost_policy" ON public.floq_boosts;
DROP POLICY IF EXISTS "old_invite_policy" ON public.floq_invitations;
DROP POLICY IF EXISTS "old_mention_policy" ON public.user_notifications;
DROP POLICY IF EXISTS "legacy_afterglow_policy" ON public.daily_afterglow;
DROP POLICY IF EXISTS "legacy_plan_policy" ON public.floq_plans;
DROP POLICY IF EXISTS "legacy_venue_policy" ON public.venues;

-- Consolidate user_settings policies
DROP POLICY IF EXISTS "user_settings_self_only" ON public.user_settings;
CREATE POLICY "unified_user_settings_access" ON public.user_settings
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Consolidate user_preferences policies  
DROP POLICY IF EXISTS "user_preferences_self_only" ON public.user_preferences;
CREATE POLICY "unified_user_preferences_access" ON public.user_preferences
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Consolidate floq_settings policies
DROP POLICY IF EXISTS "floq_settings_creator_only" ON public.floq_settings;
CREATE POLICY "unified_floq_settings_access" ON public.floq_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.floqs f
      WHERE f.id = floq_settings.floq_id 
        AND f.creator_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.floqs f
      WHERE f.id = floq_settings.floq_id 
        AND f.creator_id = auth.uid()
    )
  );

-- Consolidate floq_boosts policies
DROP POLICY IF EXISTS "user_can_boost" ON public.floq_boosts;
DROP POLICY IF EXISTS "user_can_unboost" ON public.floq_boosts;
DROP POLICY IF EXISTS "active_boosts_visible" ON public.floq_boosts;
CREATE POLICY "unified_floq_boosts_access" ON public.floq_boosts
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Ensure venue_live_presence has public read access
DROP POLICY IF EXISTS "venue_presence_read" ON public.venue_live_presence;
CREATE POLICY "unified_venue_presence_read" ON public.venue_live_presence
  FOR SELECT
  USING (true);

-- Ensure venue_feed_posts has public read for non-expired posts
DROP POLICY IF EXISTS "venue_feed_read" ON public.venue_feed_posts;
CREATE POLICY "unified_venue_feed_read" ON public.venue_feed_posts
  FOR SELECT
  USING (expires_at > now());

-- Consolidate user_notifications policies
DROP POLICY IF EXISTS "notifications_self_only" ON public.user_notifications;
CREATE POLICY "unified_notifications_access" ON public.user_notifications
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Ensure field_tiles has public read access for map data
CREATE POLICY "unified_field_tiles_read" ON public.field_tiles
  FOR SELECT
  USING (true);