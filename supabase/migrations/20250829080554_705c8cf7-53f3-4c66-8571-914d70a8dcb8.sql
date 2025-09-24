-- Fix Critical RLS Security Issues
-- Phase 4 Database Security Remediation

BEGIN;

-- 1. Add RLS policies for tables with RLS enabled but no policies

-- dedupe_decisions - internal tool, restrict to service role
DROP POLICY IF EXISTS "dedupe_decisions_service_only" ON public.dedupe_decisions;
CREATE POLICY "dedupe_decisions_service_only" 
ON public.dedupe_decisions 
FOR ALL 
USING (current_setting('request.jwt.claim.role', true) = 'service_role');

-- presence_events - user can only see their own events
DROP POLICY IF EXISTS "presence_events_own_access" ON public.presence_events;
CREATE POLICY "presence_events_own_access" 
ON public.presence_events 
FOR ALL 
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

-- ripple_signals - users can see public signals and their own
DROP POLICY IF EXISTS "ripple_signals_public_read" ON public.ripple_signals;
DROP POLICY IF EXISTS "ripple_signals_own_manage" ON public.ripple_signals;
CREATE POLICY "ripple_signals_public_read" 
ON public.ripple_signals 
FOR SELECT 
USING (visibility = 'public' OR sender_id = auth.uid());

CREATE POLICY "ripple_signals_own_manage" 
ON public.ripple_signals 
FOR INSERT 
WITH CHECK (sender_id = auth.uid());

-- social_clusters - read-only for authenticated users
DROP POLICY IF EXISTS "social_clusters_read" ON public.social_clusters;
CREATE POLICY "social_clusters_read" 
ON public.social_clusters 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- venue_import_runs - service role only
DROP POLICY IF EXISTS "venue_import_runs_service_only" ON public.venue_import_runs;
CREATE POLICY "venue_import_runs_service_only" 
ON public.venue_import_runs 
FOR ALL 
USING (current_setting('request.jwt.claim.role', true) = 'service_role');

-- 2. Fix Security Definer Views by converting to regular views where appropriate
-- Note: Some security definer views are intentional for cross-user data access
-- We'll audit them individually rather than blanket removing SECURITY DEFINER

-- 3. Add missing RLS policies for core tables that should have user restrictions

-- Ensure all presence/location tables have proper user access
DO $$
BEGIN
  -- vibes_now should allow users to see public vibes and manage their own
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vibes_now' AND policyname = 'vibes_now_public_read') THEN
    CREATE POLICY "vibes_now_public_read" 
    ON public.vibes_now 
    FOR SELECT 
    USING (visibility = 'public' OR profile_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vibes_now' AND policyname = 'vibes_now_own_manage') THEN
    CREATE POLICY "vibes_now_own_manage" 
    ON public.vibes_now 
    FOR ALL 
    USING (profile_id = auth.uid())
    WITH CHECK (profile_id = auth.uid());
  END IF;

  -- raw_locations should be user-private only
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'raw_locations' AND policyname = 'raw_locations_own_only') THEN
    CREATE POLICY "raw_locations_own_only" 
    ON public.raw_locations 
    FOR ALL 
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
  END IF;

END $$;

-- 4. Ensure proper indexes exist for RLS policy performance
CREATE INDEX IF NOT EXISTS idx_presence_events_profile_id ON public.presence_events(profile_id);
CREATE INDEX IF NOT EXISTS idx_ripple_signals_sender_visibility ON public.ripple_signals(sender_id, visibility);
CREATE INDEX IF NOT EXISTS idx_vibes_now_profile_visibility ON public.vibes_now(profile_id, visibility);

COMMIT;