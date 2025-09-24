-- Fix get_profile_stats function to use actual existing tables and columns
DROP FUNCTION IF EXISTS public.get_profile_stats(uuid, integer, integer);

CREATE OR REPLACE FUNCTION public.get_profile_stats(
  target_profile_id uuid,
  metres integer DEFAULT 100,
  seconds integer DEFAULT 3600
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  friend_count_val int := 0;
  crossings_7d_val int := 0;
  most_active_vibe_val text := 'social';
  days_active_val int := 0;
  total_achievements_val int := 0;
  vibe_distribution_val jsonb := '[]'::jsonb;
  recent_vibes_val jsonb := '[]'::jsonb;
BEGIN
  -- Friend count from v_friends_with_presence view (using friend_id as confirmed in the view)
  SELECT COUNT(*)
  INTO   friend_count_val
  FROM   public.v_friends_with_presence
  WHERE  friend_id = target_profile_id;

  -- Crossings in last 7 days (using created_at instead of updated_at)
  SELECT COUNT(*)
  INTO   crossings_7d_val
  FROM   public.crossed_paths
  WHERE  (user_a = target_profile_id OR user_b = target_profile_id)
    AND  created_at >= NOW() - INTERVAL '7 days';

  -- Most active vibe - placeholder since no vibe state table exists
  most_active_vibe_val := 'social';

  -- Days active this month - placeholder since no activity tracking table found
  days_active_val := 0;

  -- Total achievements (using achievements table, not user_achievements)
  SELECT COUNT(*)
  INTO   total_achievements_val
  FROM   public.achievements
  WHERE  profile_id = target_profile_id
    AND  earned_at IS NOT NULL;

  -- Vibe distribution - empty since no vibe tracking table
  vibe_distribution_val := '[]'::jsonb;

  -- Recent vibes - empty since no vibe tracking table
  recent_vibes_val := '[]'::jsonb;

  RETURN jsonb_build_object(
    'friend_count', friend_count_val,
    'crossings_7d', crossings_7d_val,
    'most_active_vibe', most_active_vibe_val,
    'days_active_this_month', days_active_val,
    'total_achievements', total_achievements_val,
    'vibe_distribution', vibe_distribution_val,
    'recent_vibes', recent_vibes_val
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_profile_stats(uuid, integer, integer) TO authenticated;