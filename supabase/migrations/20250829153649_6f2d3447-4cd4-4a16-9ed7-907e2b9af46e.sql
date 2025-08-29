-- CRITICAL SECURITY FIX: Enable RLS on tables missing security policies
BEGIN;

-- Enable RLS on proximity_system_logs table
ALTER TABLE public.proximity_system_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for proximity_system_logs - users can only see their own logs
CREATE POLICY "users_own_proximity_logs" 
ON public.proximity_system_logs
FOR ALL
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

-- Enable RLS on venue_category_map table
ALTER TABLE public.venue_category_map ENABLE ROW LEVEL SECURITY;

-- Create policy for venue_category_map - this appears to be a reference table, make it read-only for authenticated users
CREATE POLICY "authenticated_users_read_venue_categories" 
ON public.venue_category_map
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Enable RLS on venue_hours table  
ALTER TABLE public.venue_hours ENABLE ROW LEVEL SECURITY;

-- Create policy for venue_hours - read-only for authenticated users (public venue data)
CREATE POLICY "authenticated_users_read_venue_hours" 
ON public.venue_hours
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Enable RLS on venue_metrics_daily table
ALTER TABLE public.venue_metrics_daily ENABLE ROW LEVEL SECURITY;

-- Create policy for venue_metrics_daily - read-only for authenticated users (aggregated public data)
CREATE POLICY "authenticated_users_read_venue_metrics" 
ON public.venue_metrics_daily
FOR SELECT
USING (auth.uid() IS NOT NULL);

COMMIT;