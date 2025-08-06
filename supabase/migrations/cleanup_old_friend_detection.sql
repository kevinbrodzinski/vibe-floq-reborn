-- Cleanup script for old friend detection tables and functions
-- Run this BEFORE the main friend detection migration

-- Drop old tables (CASCADE will drop dependent objects)
DROP TABLE IF EXISTS public.friendship_analysis CASCADE;
DROP TABLE IF EXISTS public.friend_suggestions CASCADE;

-- Drop old functions with their specific signatures
DROP FUNCTION IF EXISTS public.analyze_co_location_events(uuid, uuid, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS public.analyze_shared_floq_participation(uuid, uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS public.analyze_shared_plan_participation(uuid, uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS public.analyze_venue_overlap_patterns(uuid, uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS public.analyze_time_sync_patterns(uuid, uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_friend_suggestion_candidates(uuid, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS public.upsert_friendship_analysis(uuid, uuid, decimal, text, jsonb, text) CASCADE;
DROP FUNCTION IF EXISTS public.create_friend_suggestion(uuid, uuid, decimal, text, text, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_expired_friend_suggestions() CASCADE;

-- Drop any old indexes that might conflict
DROP INDEX IF EXISTS public.idx_friendship_analysis_profiles;
DROP INDEX IF EXISTS public.idx_friendship_analysis_score;
DROP INDEX IF EXISTS public.idx_friend_suggestions_target;
DROP INDEX IF EXISTS public.idx_friend_suggestions_expires;

-- Remove any old cron jobs that might conflict
SELECT cron.unschedule('cleanup_friend_suggestions_hourly') WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'cleanup_friend_suggestions_hourly'
);