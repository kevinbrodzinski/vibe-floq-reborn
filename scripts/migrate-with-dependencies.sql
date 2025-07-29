-- Comprehensive Migration Script with Dependencies
-- Project: reztyrrafsmlvvlqvsqt
-- Apply this SQL to production via Supabase Dashboard

-- WARNING: This script will drop and recreate dependent objects
-- Make sure to backup your database first

-- Step 1: Drop dependent materialized views first
DROP MATERIALIZED VIEW IF EXISTS public.v_friend_sparkline CASCADE;

-- Step 2: Drop dependent regular views
DROP VIEW IF EXISTS public.v_active_users CASCADE;

-- Step 3: Drop user_id from vibes_now table
ALTER TABLE public.vibes_now DROP COLUMN IF EXISTS user_id;

-- Step 4: Recreate the v_active_users view with correct structure
CREATE OR REPLACE VIEW public.v_active_users AS
SELECT 
  profile_id,  -- Changed from user_id to profile_id
  st_y((location)::geometry) AS lat,
  st_x((location)::geometry) AS lng,
  vibe,
  updated_at
FROM vibes_now vn
WHERE (expires_at > now()) AND (visibility = 'public'::text);

-- Step 5: Drop user_id from all other tables (excluding vibes_now which we already handled)
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
ALTER TABLE public.weekly_ai_suggestion_cooldowns DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.weekly_ai_suggestions DROP COLUMN IF EXISTS user_id;

-- Step 6: Recreate the materialized view v_friend_sparkline (if needed)
-- You'll need to provide the original definition and update it to use profile_id
-- CREATE MATERIALIZED VIEW public.v_friend_sparkline AS
-- SELECT ... (updated definition using profile_id instead of user_id)
-- FROM ... (updated tables using profile_id)

-- Step 7: Verify all user_id columns have been removed
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND column_name = 'user_id'
ORDER BY table_name;

-- Step 8: Check for any remaining references to user_id in functions
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_definition LIKE '%user_id%'
ORDER BY routine_name; 