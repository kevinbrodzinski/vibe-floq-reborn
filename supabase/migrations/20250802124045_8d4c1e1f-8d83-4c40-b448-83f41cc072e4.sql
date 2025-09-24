-- Fix get_profile_stats function to use correct column name from v_friends_with_presence view
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
  -- Friend count from v_friends_with_presence view
  SELECT COUNT(*)
  INTO   friend_count_val
  FROM   public.v_friends_with_presence
  WHERE  friend_id = target_profile_id;

  -- Crossings in last 7 days
  SELECT COUNT(*)
  INTO   crossings_7d_val
  FROM   public.crossed_paths
  WHERE  (user_a = target_profile_id OR user_b = target_profile_id)
    AND  created_at >= NOW() - INTERVAL '7 days';

  -- Most active vibe (fallback to 'social')
  SELECT   COALESCE(vibe::text, 'social')
  INTO     most_active_vibe_val
  FROM     public.user_vibe_states
  WHERE    profile_id = target_profile_id
    AND    active = true
  ORDER BY updated_at DESC
  LIMIT    1;

  -- Days active this month
  SELECT COUNT(DISTINCT DATE(updated_at))
  INTO   days_active_val
  FROM   public.user_vibe_states
  WHERE  profile_id = target_profile_id
    AND  updated_at >= DATE_TRUNC('month', NOW());

  -- Total achievements
  SELECT COUNT(*)
  INTO   total_achievements_val
  FROM   public.user_achievements
  WHERE  profile_id = target_profile_id
    AND  earned_at IS NOT NULL;

  -- Vibe distribution (last 30 days)
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'vibe', vibe,
        'count', count,
        'percentage', ROUND((count::numeric / total_count::numeric) * 100, 1)
      )
    ),
    '[]'::jsonb
  )
  INTO vibe_distribution_val
  FROM (
    SELECT 
      vibe::text,
      COUNT(*) as count,
      SUM(COUNT(*)) OVER () as total_count
    FROM public.user_vibe_states
    WHERE profile_id = target_profile_id
      AND updated_at >= NOW() - INTERVAL '30 days'
    GROUP BY vibe
    ORDER BY count DESC
    LIMIT 5
  ) vibe_stats;

  -- Recent vibes (last 10)
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'vibe', vibe::text,
        'timestamp', EXTRACT(epoch FROM updated_at)::bigint,
        'ts', updated_at::text
      )
      ORDER BY updated_at DESC
    ),
    '[]'::jsonb
  )
  INTO recent_vibes_val
  FROM (
    SELECT vibe, updated_at
    FROM public.user_vibe_states
    WHERE profile_id = target_profile_id
    ORDER BY updated_at DESC
    LIMIT 10
  ) recent;

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