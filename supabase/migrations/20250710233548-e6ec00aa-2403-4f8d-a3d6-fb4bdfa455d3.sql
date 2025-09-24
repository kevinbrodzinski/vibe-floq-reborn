-- Enhance get_profile_stats function to include vibe distribution and history
CREATE OR REPLACE FUNCTION public.get_profile_stats(target_user_id uuid, metres integer DEFAULT 100, seconds integer DEFAULT 3600)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  user_location geometry;
BEGIN
  -- Get user's current location
  SELECT location INTO user_location 
  FROM vibes_now 
  WHERE user_id = target_user_id;
  
  -- Build enhanced stats in single query
  SELECT jsonb_build_object(
    'friend_count', COALESCE(friend_stats.friend_count, 0),
    'crossings_7d', COALESCE(crossing_stats.crossings_7d, 0),
    'most_active_vibe', COALESCE(vibe_stats.most_active_vibe, 'unknown'),
    'days_active_this_month', COALESCE(activity_stats.days_active, 0),
    'total_achievements', COALESCE(achievement_stats.total_achievements, 0),
    'vibe_distribution', COALESCE(vibe_distribution.distribution, '[]'::jsonb),
    'recent_vibes', COALESCE(recent_vibes.history, '[]'::jsonb)
  ) INTO result
  FROM (
    -- Friend count (handle symmetry properly)
    SELECT COUNT(DISTINCT f.friend_id) as friend_count
    FROM friendships f
    WHERE f.user_id = target_user_id
  ) friend_stats
  CROSS JOIN (
    -- Crossings in last 7 days using PostGIS
    SELECT COUNT(DISTINCT v2.user_id) as crossings_7d
    FROM vibes_log v1
    JOIN vibes_log v2 ON (
      v1.user_id = target_user_id
      AND v2.user_id != target_user_id
      AND ST_DWithin(v1.location, v2.location, metres)
      AND abs(extract(epoch from (v1.ts - v2.ts))) <= seconds
    )
    WHERE v1.ts >= (now() - interval '7 days')
      AND v2.ts >= (now() - interval '7 days')
  ) crossing_stats
  CROSS JOIN (
    -- Most active vibe this week
    SELECT vibe::text as most_active_vibe
    FROM vibes_log
    WHERE user_id = target_user_id 
      AND ts >= (now() - interval '7 days')
    GROUP BY vibe
    ORDER BY COUNT(*) DESC
    LIMIT 1
  ) vibe_stats
  CROSS JOIN (
    -- Days active this month
    SELECT COUNT(DISTINCT DATE(ts)) as days_active
    FROM vibes_log
    WHERE user_id = target_user_id 
      AND ts >= date_trunc('month', now())
  ) activity_stats
  CROSS JOIN (
    -- Total achievements
    SELECT COUNT(*) as total_achievements
    FROM achievements
    WHERE user_id = target_user_id
  ) achievement_stats
  CROSS JOIN (
    -- Vibe distribution for last 30 days (for personality analysis)
    SELECT jsonb_agg(
      jsonb_build_object(
        'vibe', vibe::text,
        'count', count,
        'percentage', ROUND((count * 100.0 / total_count), 1)
      ) ORDER BY count DESC
    ) as distribution
    FROM (
      SELECT 
        vibe,
        COUNT(*) as count,
        SUM(COUNT(*)) OVER() as total_count
      FROM vibes_log
      WHERE user_id = target_user_id 
        AND ts >= (now() - interval '30 days')
      GROUP BY vibe
    ) vibe_counts
  ) vibe_distribution
  CROSS JOIN (
    -- Recent vibe history for sparkline (last 50 entries)
    SELECT jsonb_agg(
      jsonb_build_object(
        'vibe', vibe::text,
        'timestamp', extract(epoch from ts),
        'ts', ts
      ) ORDER BY ts DESC
    ) as history
    FROM (
      SELECT vibe, ts
      FROM vibes_log
      WHERE user_id = target_user_id 
      ORDER BY ts DESC
      LIMIT 50
    ) recent_log
  ) recent_vibes;

  RETURN COALESCE(result, '{}'::jsonb);
END;
$function$;