-- ================================================================
-- Security Fixes: Enable RLS and Fix Critical Database Issues
-- Sprint #28: Address Supabase linter critical security issues
-- ================================================================

-- 1. Enable RLS on tables that need it
ALTER TABLE public.vibe_clusters_checksum ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievement_catalogue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.floq_mention_cooldown ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refresh_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vibe_clusters_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_action_log ENABLE ROW LEVEL SECURITY;

-- 2. Create RLS policies for system/admin tables
-- Achievement catalogue - read-only for authenticated users
CREATE POLICY "achievement_catalogue_public_read"
  ON public.achievement_catalogue
  FOR SELECT
  USING (true);

-- Event areas - read-only for authenticated users  
CREATE POLICY "event_areas_public_read"
  ON public.event_areas
  FOR SELECT
  USING (true);

-- Vibe clusters checksum - system table, restrict access
CREATE POLICY "vibe_clusters_checksum_system_only"
  ON public.vibe_clusters_checksum
  FOR ALL
  USING (current_setting('role') = 'service_role');

-- Venue clusters - public read access
CREATE POLICY "venue_clusters_public_read"
  ON public.venue_clusters
  FOR SELECT
  USING (true);

-- Floq mention cooldown - users can only see their own records
CREATE POLICY "floq_mention_cooldown_own_records"
  ON public.floq_mention_cooldown
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Refresh metrics - system only
CREATE POLICY "refresh_metrics_system_only"
  ON public.refresh_metrics
  FOR ALL
  USING (current_setting('role') = 'service_role');

-- Vibe clusters history - public read access
CREATE POLICY "vibe_clusters_history_public_read"
  ON public.vibe_clusters_history
  FOR SELECT
  USING (true);

-- User action log - users can only see their own logs
CREATE POLICY "user_action_log_own_records"
  ON public.user_action_log
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 3. Grant appropriate permissions
GRANT SELECT ON public.achievement_catalogue TO authenticated, anon;
GRANT SELECT ON public.event_areas TO authenticated, anon;
GRANT SELECT ON public.venue_clusters TO authenticated, anon;
GRANT SELECT ON public.vibe_clusters_history TO authenticated, anon;

-- 4. Note: spatial_ref_sys is a PostGIS system table, leaving it as-is
-- It's safe to leave this table without RLS as it contains only geographic reference data