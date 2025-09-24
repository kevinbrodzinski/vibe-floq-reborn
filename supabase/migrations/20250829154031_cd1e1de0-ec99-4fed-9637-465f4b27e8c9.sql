-- CRITICAL SECURITY FIX: Enable RLS on tables missing security policies
-- Based on actual table structures, not assumptions
BEGIN;

-- proximity_system_logs: System-level aggregated logs with no user association
-- Only service role should access these system logs
ALTER TABLE public.proximity_system_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only_proximity_logs" 
ON public.proximity_system_logs
FOR ALL
USING (current_setting('request.jwt.claim.role'::text, true) = 'service_role'::text)
WITH CHECK (current_setting('request.jwt.claim.role'::text, true) = 'service_role'::text);

-- venue_category_map: Reference data mapping provider categories to canonical ones
-- Read-only for authenticated users
ALTER TABLE public.venue_category_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_users_read_venue_categories" 
ON public.venue_category_map
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- venue_hours: Venue operating hours data
-- Read-only for authenticated users (public venue information)
ALTER TABLE public.venue_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_users_read_venue_hours" 
ON public.venue_hours
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- venue_metrics_daily: Daily venue metrics aggregated data
-- Read-only for authenticated users (public venue analytics)
ALTER TABLE public.venue_metrics_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_users_read_venue_metrics" 
ON public.venue_metrics_daily
FOR SELECT
USING (auth.uid() IS NOT NULL);

COMMIT;