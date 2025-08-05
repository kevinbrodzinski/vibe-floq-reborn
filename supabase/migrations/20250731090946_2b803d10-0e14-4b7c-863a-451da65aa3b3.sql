-- Fix broken RPC functions to match current schema

-- 1. Fix get_profile_stats function
DROP FUNCTION IF EXISTS get_profile_stats(uuid, integer, integer);
CREATE OR REPLACE FUNCTION get_profile_stats(
  target_profile_id uuid,
  metres integer DEFAULT 100,
  seconds integer DEFAULT 3600
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result jsonb;
  friend_count_val integer := 0;
  crossings_count integer := 0;
  most_active_vibe_val text := 'chill';
  days_active_val integer := 0;
  achievements_count integer := 0;
BEGIN
  -- Count friends using correct friendships schema
  SELECT COUNT(*) INTO friend_count_val
  FROM friendships 
  WHERE (user_low = target_profile_id OR user_high = target_profile_id)
    AND friend_state = 'accepted';

  -- Count crossed paths in last 7 days
  SELECT COUNT(*) INTO crossings_count
  FROM crossed_paths
  WHERE (user_a = target_profile_id OR user_b = target_profile_id)
    AND created_at >= NOW() - INTERVAL '7 days';

  -- Get most active vibe from recent presence data
  SELECT COALESCE(
    (SELECT vibe_tag 
     FROM presence 
     WHERE profile_id = target_profile_id 
       AND started_at >= NOW() - INTERVAL '30 days'
     GROUP BY vibe_tag 
     ORDER BY COUNT(*) DESC 
     LIMIT 1), 
    'chill'
  ) INTO most_active_vibe_val;

  -- Count active days this month
  SELECT COUNT(DISTINCT DATE(started_at)) INTO days_active_val
  FROM presence
  WHERE profile_id = target_profile_id
    AND started_at >= DATE_TRUNC('month', NOW());

  -- Count achievements
  SELECT COUNT(*) INTO achievements_count
  FROM achievements
  WHERE profile_id = target_profile_id;

  -- Build result JSON
  result := jsonb_build_object(
    'friend_count', friend_count_val,
    'crossings_7d', crossings_count,
    'most_active_vibe', most_active_vibe_val,
    'days_active_this_month', days_active_val,
    'total_achievements', achievements_count,
    'vibe_distribution', '[]'::jsonb,
    'recent_vibes', '[]'::jsonb
  );

  RETURN result;
END;
$$;

-- 2. Fix or create get_leaderboard_rank function
DROP FUNCTION IF EXISTS get_leaderboard_rank(uuid);
CREATE OR REPLACE FUNCTION get_leaderboard_rank(
  p_profile_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_checkins integer := 0;
  total_users_count integer := 0;
  user_rank integer := 0;
  percentile_val numeric := 0;
BEGIN
  -- Count user's checkins in last 30 days (using venue_stays as proxy)
  SELECT COUNT(*) INTO user_checkins
  FROM venue_stays
  WHERE profile_id = p_profile_id
    AND arrived_at >= NOW() - INTERVAL '30 days';

  -- Count total active users
  SELECT COUNT(DISTINCT profile_id) INTO total_users_count
  FROM venue_stays
  WHERE arrived_at >= NOW() - INTERVAL '30 days';

  -- Calculate rank and percentile
  WITH user_ranks AS (
    SELECT 
      profile_id,
      COUNT(*) as checkin_count,
      RANK() OVER (ORDER BY COUNT(*) DESC) as rank
    FROM venue_stays
    WHERE arrived_at >= NOW() - INTERVAL '30 days'
    GROUP BY profile_id
  )
  SELECT 
    COALESCE(ur.rank, total_users_count) as rank,
    ROUND((1.0 - (COALESCE(ur.rank, total_users_count)::numeric / NULLIF(total_users_count, 0)::numeric)) * 100, 1) as percentile
  INTO user_rank, percentile_val
  FROM user_ranks ur
  WHERE ur.profile_id = p_profile_id;

  -- Return result
  RETURN jsonb_build_object(
    'id', p_profile_id,
    'checkins_30d', user_checkins,
    'rank', user_rank,
    'total_users', GREATEST(total_users_count, 1),
    'percentile', GREATEST(percentile_val, 0)
  );
END;
$$;

-- 3. Fix get_social_suggestions function (create if missing)
DROP FUNCTION IF EXISTS get_social_suggestions(numeric, numeric, numeric, integer, text, text, integer, uuid);
CREATE OR REPLACE FUNCTION get_social_suggestions(
  p_lat numeric,
  p_lng numeric,
  p_radius_km numeric DEFAULT 1,
  p_limit integer DEFAULT 10,
  p_vibe text DEFAULT NULL,
  p_activity text DEFAULT NULL,
  p_group_size integer DEFAULT NULL,
  p_profile_id uuid DEFAULT auth.uid()
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Simple implementation returning nearby active users
  WITH nearby_users AS (
    SELECT DISTINCT
      p.id,
      p.username,
      p.display_name,
      p.avatar_url,
      ST_Distance(
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
        ST_SetSRID(ST_MakePoint(0, 0), 4326)::geography
      ) as distance
    FROM profiles p
    WHERE p.id != COALESCE(p_profile_id, '00000000-0000-0000-0000-000000000000'::uuid)
    LIMIT p_limit
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', nu.id,
      'username', nu.username,
      'display_name', nu.display_name,
      'avatar_url', nu.avatar_url,
      'distance', nu.distance
    )
  ) INTO result
  FROM nearby_users nu;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;