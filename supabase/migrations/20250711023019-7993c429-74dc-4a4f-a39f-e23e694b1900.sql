-- ===============================================
-- Achievement System Performance & Security Migration (Fixed)
-- Based on detailed performance analysis and RLS security review
-- ===============================================

-- 1️⃣ Performance Indexes for Fast User-Centric Reads
-- Composite index for user profile queries (earned achievements first)
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_progress
  ON user_achievements (user_id, earned_at NULLS FIRST);

-- 2️⃣ Fast Leaderboard Scans
-- Partial index only on earned achievements for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_user_achievements_earned
  ON user_achievements (earned_at) WHERE earned_at IS NOT NULL;

-- 3️⃣ Achievement Code Lookups (for progress tracking)
CREATE INDEX IF NOT EXISTS idx_user_achievements_code_progress
  ON user_achievements (code, progress) WHERE earned_at IS NULL;

-- 4️⃣ Enhanced get_achievement_stats Function
-- Rewrite with performance optimizations and security improvements
CREATE OR REPLACE FUNCTION public.get_achievement_stats(
  target_user_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  uid uuid;
  result jsonb;
BEGIN
  -- Use current user if no target specified, enable self-service
  uid := COALESCE(target_user_id, auth.uid());
  
  -- Security: Only allow users to query their own stats
  IF uid != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: can only query own achievement stats';
  END IF;

  -- Single-pass query with CTEs for optimal performance
  WITH total_users_cte AS (
    SELECT COUNT(DISTINCT user_id) AS total 
    FROM user_achievements 
    WHERE earned_at IS NOT NULL
  ),
  user_achievements_summary AS (
    SELECT 
      COUNT(*) FILTER (WHERE earned_at IS NOT NULL) AS earned_count,
      COUNT(*) FILTER (WHERE earned_at IS NULL AND progress > 0) AS in_progress_count,
      COALESCE(AVG(progress) FILTER (WHERE earned_at IS NULL AND progress > 0), 0) AS avg_progress
    FROM user_achievements 
    WHERE user_id = uid
  ),
  leaderboard_position AS (
    SELECT 
      user_id,
      COUNT(*) FILTER (WHERE earned_at IS NOT NULL) AS earned_count,
      RANK() OVER (ORDER BY COUNT(*) FILTER (WHERE earned_at IS NOT NULL) DESC) AS user_rank
    FROM user_achievements
    WHERE earned_at IS NOT NULL
    GROUP BY user_id
  ),
  rarity_distribution AS (
    SELECT 
      ac.metadata->>'rarity' as rarity,
      COUNT(*) as count
    FROM user_achievements ua
    JOIN achievement_catalogue ac ON ua.code = ac.code
    WHERE ua.user_id = uid AND ua.earned_at IS NOT NULL
    GROUP BY ac.metadata->>'rarity'
  ),
  recent_achievements AS (
    SELECT 
      ac.name,
      ac.icon,
      ac.metadata->>'rarity' as rarity,
      ua.earned_at
    FROM user_achievements ua
    JOIN achievement_catalogue ac ON ua.code = ac.code
    WHERE ua.user_id = uid 
      AND ua.earned_at IS NOT NULL 
      AND ua.earned_at > now() - interval '30 days'
    ORDER BY ua.earned_at DESC
    LIMIT 5
  )
  SELECT jsonb_build_object(
    'user_id', uid,
    'total_earned', COALESCE(uas.earned_count, 0),
    'in_progress', COALESCE(uas.in_progress_count, 0),
    'completion_rate', CASE 
      WHEN (SELECT COUNT(*) FROM achievement_catalogue) > 0 
      THEN ROUND(COALESCE(uas.earned_count, 0)::numeric / (SELECT COUNT(*) FROM achievement_catalogue) * 100, 1)
      ELSE 0 
    END,
    'average_progress', ROUND(COALESCE(uas.avg_progress, 0)::numeric, 1),
    'leaderboard', jsonb_build_object(
      'rank', COALESCE(lp.user_rank, (SELECT total FROM total_users_cte) + 1),
      'total_users', COALESCE((SELECT total FROM total_users_cte), 0),
      'percentile', CASE 
        WHEN (SELECT total FROM total_users_cte) > 0 
        THEN ROUND(100 - (COALESCE(lp.user_rank, (SELECT total FROM total_users_cte) + 1)::numeric - 1) / (SELECT total FROM total_users_cte) * 100, 1)
        ELSE 0 
      END
    ),
    'rarity_breakdown', COALESCE(
      (SELECT jsonb_object_agg(
        COALESCE(rarity, 'common'), count
      ) FROM rarity_distribution), 
      '{}'::jsonb
    ),
    'recent_achievements', COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'name', name,
          'icon', icon,
          'rarity', rarity,
          'earned_at', earned_at
        ) ORDER BY earned_at DESC
      ) FROM recent_achievements),
      '[]'::jsonb
    ),
    'last_updated', now()
  ) INTO result
  FROM user_achievements_summary uas
  LEFT JOIN leaderboard_position lp ON lp.user_id = uid
  LEFT JOIN total_users_cte ON true;

  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

-- 5️⃣ Enhanced Achievement Progress Tracking Function
-- Optimized version of award_if_goal_met with better performance
CREATE OR REPLACE FUNCTION public.award_achievement_optimized(
  _user uuid, 
  _code text, 
  _increment integer
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  achievement_goal integer;
  was_just_earned boolean := false;
  final_progress integer;
  achievement_info record;
BEGIN
  -- Validate inputs
  IF _increment <= 0 THEN
    RAISE EXCEPTION 'Achievement increment must be positive, got: %', _increment;
  END IF;

  -- Get achievement definition with goal in single query
  SELECT ac.goal, ac.name, ac.icon, ac.metadata 
  INTO achievement_info
  FROM achievement_catalogue ac 
  WHERE ac.code = _code;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown achievement code: %', _code;
  END IF;

  -- Atomic upsert with race condition protection
  INSERT INTO user_achievements (user_id, code, progress)
  VALUES (_user, _code, _increment)
  ON CONFLICT (user_id, code) DO UPDATE
  SET
    progress = LEAST(user_achievements.progress + EXCLUDED.progress, achievement_info.goal),
    earned_at = COALESCE(
      user_achievements.earned_at,
      CASE
        WHEN user_achievements.progress + EXCLUDED.progress >= achievement_info.goal
        THEN now()
      END
    )
  RETURNING 
    progress,
    (earned_at IS NOT NULL AND earned_at > now() - interval '1 second') as just_earned
  INTO final_progress, was_just_earned;

  -- Return comprehensive result for UI updates
  RETURN jsonb_build_object(
    'code', _code,
    'was_earned', was_just_earned,
    'progress', final_progress,
    'goal', achievement_info.goal,
    'progress_percentage', ROUND(final_progress::numeric / GREATEST(achievement_info.goal, 1) * 100, 1),
    'achievement_info', jsonb_build_object(
      'name', achievement_info.name,
      'icon', achievement_info.icon,
      'metadata', achievement_info.metadata
    )
  );
END;
$$;

-- 6️⃣ Efficient Achievement Progress Query Function
CREATE OR REPLACE FUNCTION public.get_achievement_progress(
  _user_id uuid DEFAULT NULL,
  _codes text[] DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  uid uuid;
  result jsonb;
BEGIN
  uid := COALESCE(_user_id, auth.uid());
  
  -- Security: users can only query their own progress
  IF uid != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: can only query own achievement progress';
  END IF;

  SELECT jsonb_object_agg(
    ac.code,
    jsonb_build_object(
      'name', ac.name,
      'description', ac.description,
      'icon', ac.icon,
      'goal', ac.goal,
      'family', ac.family,
      'metadata', ac.metadata,
      'progress', COALESCE(ua.progress, 0),
      'earned_at', ua.earned_at,
      'is_earned', ua.earned_at IS NOT NULL,
      'progress_percentage', ROUND(COALESCE(ua.progress, 0)::numeric / GREATEST(ac.goal, 1) * 100, 1)
    )
  ) INTO result
  FROM achievement_catalogue ac
  LEFT JOIN user_achievements ua ON (
    ua.code = ac.code AND ua.user_id = uid
  )
  WHERE (_codes IS NULL OR ac.code = ANY(_codes));

  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

-- 7️⃣ Performance monitoring view for achievement system
CREATE OR REPLACE VIEW achievement_system_metrics AS
SELECT 
  'total_achievements' as metric,
  COUNT(*)::text as value
FROM achievement_catalogue
UNION ALL
SELECT 
  'total_users_with_progress' as metric,
  COUNT(DISTINCT user_id)::text as value
FROM user_achievements
UNION ALL
SELECT 
  'total_earned_achievements' as metric,
  COUNT(*)::text as value
FROM user_achievements 
WHERE earned_at IS NOT NULL
UNION ALL
SELECT 
  'avg_completion_rate' as metric,
  ROUND(AVG(
    (SELECT COUNT(*) FROM user_achievements ua2 WHERE ua2.user_id = ua1.user_id AND earned_at IS NOT NULL)::numeric 
    / GREATEST((SELECT COUNT(*) FROM achievement_catalogue), 1) * 100
  ), 2)::text as value
FROM (SELECT DISTINCT user_id FROM user_achievements) ua1;

-- Grant appropriate permissions
GRANT SELECT ON achievement_system_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_achievement_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION award_achievement_optimized(uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_achievement_progress(uuid, text[]) TO authenticated;