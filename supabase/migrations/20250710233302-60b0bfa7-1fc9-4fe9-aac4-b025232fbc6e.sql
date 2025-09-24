-- Grant execute permissions for get_profile_stats function
GRANT EXECUTE ON FUNCTION public.get_profile_stats(uuid, integer, integer) TO authenticated;

-- Add composite index on vibes_log for better performance on user timeline queries
CREATE INDEX IF NOT EXISTS idx_vibes_log_user_timeline 
ON public.vibes_log (user_id, ts DESC);

-- Verify GIST index exists on vibes_log location (for proximity queries)
CREATE INDEX IF NOT EXISTS idx_vibes_log_location_gist 
ON public.vibes_log USING GIST (location);

-- Add index on achievements for user stats aggregation
CREATE INDEX IF NOT EXISTS idx_achievements_user_id 
ON public.achievements (user_id);