-- Fix Critical RLS Security Issues (Corrected)
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

-- ripple_signals - users can see their own signals (no visibility column)
DROP POLICY IF EXISTS "ripple_signals_own_access" ON public.ripple_signals;
CREATE POLICY "ripple_signals_own_access" 
ON public.ripple_signals 
FOR ALL 
USING (p1 = auth.uid() OR p2 = auth.uid())
WITH CHECK (p1 = auth.uid() OR p2 = auth.uid());

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

-- 2. Fix vibes_now policies (has visibility column)
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
    FOR INSERT 
    WITH CHECK (profile_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vibes_now' AND policyname = 'vibes_now_own_update') THEN
    CREATE POLICY "vibes_now_own_update" 
    ON public.vibes_now 
    FOR UPDATE 
    USING (profile_id = auth.uid())
    WITH CHECK (profile_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vibes_now' AND policyname = 'vibes_now_own_delete') THEN
    CREATE POLICY "vibes_now_own_delete" 
    ON public.vibes_now 
    FOR DELETE 
    USING (profile_id = auth.uid());
  END IF;

END $$;

-- 3. Add performance indexes for RLS policies
CREATE INDEX IF NOT EXISTS idx_presence_events_profile_id ON public.presence_events(profile_id);
CREATE INDEX IF NOT EXISTS idx_ripple_signals_participants ON public.ripple_signals(p1, p2);
CREATE INDEX IF NOT EXISTS idx_vibes_now_profile_visibility ON public.vibes_now(profile_id, visibility);

COMMIT;