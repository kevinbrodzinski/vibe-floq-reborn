-- Safe Drop user_id Columns Script
-- Project: reztyrrafsmlvvlqvsqt
-- Apply this SQL to production via Supabase Dashboard

-- WARNING: This script will permanently remove user_id columns
-- Only run this after confirming all tables have profile_id columns

-- Step 1: First, verify the current state (run this first)
SELECT 
  table_name,
  COUNT(CASE WHEN column_name = 'user_id' THEN 1 END) as has_user_id,
  COUNT(CASE WHEN column_name = 'profile_id' THEN 1 END) as has_profile_id
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND column_name IN ('user_id', 'profile_id')
GROUP BY table_name
HAVING COUNT(CASE WHEN column_name = 'user_id' THEN 1 END) > 0
ORDER BY table_name;

-- Step 2: Drop user_id columns from tables that have profile_id
-- Only run this after confirming the above query shows tables with both columns

-- Drop user_id from tables with profile_id
ALTER TABLE public.achievements DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.afterglow_collections DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.afterglow_favorites DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.app_user_notification DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.daily_afterglow DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.daily_recap_cache DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.event_notifications DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.flock_auto_suggestions DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.flock_history DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.floq_activity DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.floq_afterglow DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.floq_boosts DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.floq_ignored DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.floq_mention_cooldown DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.floq_message_reactions DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.friend_last_points DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.friend_requests DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.friend_share_pref DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.friend_trails DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.friendships DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.notification_queue DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.plan_activities DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.plan_afterglow DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.plan_comments DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.plan_drafts DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.plan_feedback DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.plan_invites DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.plan_participants DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.plan_stop_comments DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.plan_stop_votes DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.plan_votes DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.raw_locations DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.raw_locations_202507 DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.raw_locations_202508 DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.raw_locations_202509 DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.raw_locations_staging DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.snap_suggestion_logs DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.user_achievements DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.user_action_log DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.user_favorites DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.user_floq_activity_tracking DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.user_notifications DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.user_onboarding_progress DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.user_preferences DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.user_push_tokens DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.user_settings DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.user_vibe_states DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.user_watchlist DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.venue_feed_posts DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.venue_live_presence DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.venue_stays DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.venue_visits DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.venues_near_me DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.vibes_log DROP COLUMN IF EXISTS user_id;
-- vibes_now is handled separately in migrate-v-active-users-view.sql
-- ALTER TABLE public.vibes_now DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.weekly_ai_suggestion_cooldowns DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.weekly_ai_suggestions DROP COLUMN IF EXISTS user_id;

-- Step 3: Verify all user_id columns have been removed
-- Run this after making changes to verify
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND column_name = 'user_id'
ORDER BY table_name;

-- If the above query returns no results, all user_id columns have been successfully removed

-- Step 4: Check for any remaining references to user_id in functions
-- Run this to find any remaining function references
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_definition LIKE '%user_id%'
ORDER BY routine_name; 