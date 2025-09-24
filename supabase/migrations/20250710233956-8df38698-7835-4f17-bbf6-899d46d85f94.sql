-- Create suggest_friends RPC function for social discovery
CREATE OR REPLACE FUNCTION public.suggest_friends(
  target_user_id uuid DEFAULT auth.uid(),
  limit_count integer DEFAULT 6
)
RETURNS TABLE (
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  compatibility_score numeric,
  mutual_friends_count integer,
  crossed_paths_count integer,
  shared_interests text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_interests text[];
BEGIN
  -- Get current user's interests
  SELECT interests INTO user_interests 
  FROM profiles 
  WHERE id = target_user_id;
  
  -- If user has no interests, set empty array
  user_interests := COALESCE(user_interests, ARRAY[]::text[]);
  
  RETURN QUERY
  WITH potential_friends AS (
    -- Get all users except self and existing friends
    SELECT DISTINCT p.id as user_id
    FROM profiles p
    WHERE p.id != target_user_id
      AND p.id NOT IN (
        SELECT friend_id FROM friendships WHERE user_id = target_user_id
        UNION
        SELECT user_id FROM friendships WHERE friend_id = target_user_id
      )
      AND p.username IS NOT NULL -- Only suggest users with usernames
  ),
  mutual_friends AS (
    -- Count mutual friends for each potential friend
    SELECT 
      pf.user_id,
      COUNT(DISTINCT f1.friend_id) as mutual_count
    FROM potential_friends pf
    LEFT JOIN friendships f1 ON f1.user_id = target_user_id
    LEFT JOIN friendships f2 ON f2.user_id = pf.user_id AND f2.friend_id = f1.friend_id
    GROUP BY pf.user_id
  ),
  crossed_paths AS (
    -- Count crossed paths (proximity encounters) in last 30 days
    SELECT 
      v2.user_id,
      COUNT(DISTINCT DATE(v1.ts)) as crossings_count
    FROM vibes_log v1
    JOIN vibes_log v2 ON (
      v1.user_id = target_user_id
      AND v2.user_id != target_user_id
      AND ST_DWithin(v1.location, v2.location, 100) -- 100m proximity
      AND abs(extract(epoch from (v1.ts - v2.ts))) <= 3600 -- within 1 hour
    )
    WHERE v1.ts >= (now() - interval '30 days')
      AND v2.ts >= (now() - interval '30 days')
    GROUP BY v2.user_id
  ),
  compatibility_calc AS (
    -- Calculate Sørensen-Dice coefficient for shared interests
    SELECT 
      pf.user_id,
      p.username,
      p.display_name,
      p.avatar_url,
      p.interests,
      COALESCE(mf.mutual_count, 0) as mutual_friends_count,
      COALESCE(cp.crossings_count, 0) as crossed_paths_count,
      -- Sørensen-Dice: 2 * |A ∩ B| / (|A| + |B|)
      CASE 
        WHEN array_length(user_interests, 1) IS NULL AND array_length(p.interests, 1) IS NULL THEN 0
        WHEN array_length(user_interests, 1) IS NULL OR array_length(p.interests, 1) IS NULL THEN 0
        ELSE (
          2.0 * array_length(
            ARRAY(SELECT unnest(user_interests) INTERSECT SELECT unnest(p.interests)), 1
          ) / (array_length(user_interests, 1) + array_length(p.interests, 1))
        )
      END as interest_similarity,
      -- Get shared interests
      ARRAY(SELECT unnest(user_interests) INTERSECT SELECT unnest(p.interests)) as shared_interests
    FROM potential_friends pf
    JOIN profiles p ON p.id = pf.user_id
    LEFT JOIN mutual_friends mf ON mf.user_id = pf.user_id
    LEFT JOIN crossed_paths cp ON cp.user_id = pf.user_id
  )
  SELECT 
    cc.user_id,
    cc.username,
    cc.display_name,
    cc.avatar_url,
    -- Overall compatibility score (weighted combination)
    ROUND(
      (cc.interest_similarity * 0.5 + 
       LEAST(cc.mutual_friends_count / 5.0, 1.0) * 0.3 +
       LEAST(cc.crossed_paths_count / 3.0, 1.0) * 0.2), 3
    ) as compatibility_score,
    cc.mutual_friends_count,
    cc.crossed_paths_count,
    cc.shared_interests
  FROM compatibility_calc cc
  WHERE (
    cc.interest_similarity > 0 OR 
    cc.mutual_friends_count > 0 OR 
    cc.crossed_paths_count > 0
  )
  ORDER BY 
    -- Prioritize users with high compatibility and recent activity
    (cc.interest_similarity * 0.5 + 
     LEAST(cc.mutual_friends_count / 5.0, 1.0) * 0.3 +
     LEAST(cc.crossed_paths_count / 3.0, 1.0) * 0.2) DESC,
    cc.mutual_friends_count DESC,
    cc.crossed_paths_count DESC
  LIMIT limit_count;
END;
$function$;