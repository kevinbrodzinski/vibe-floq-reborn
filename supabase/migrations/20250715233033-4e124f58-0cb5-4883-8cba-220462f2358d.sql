-- Fix suggest_friends function to resolve ambiguous column reference and match frontend interface

DROP FUNCTION IF EXISTS public.suggest_friends(uuid, integer);

CREATE OR REPLACE FUNCTION public.suggest_friends(
  p_uid uuid DEFAULT auth.uid(),
  limit_n int DEFAULT 5
)
RETURNS TABLE(
  user_id uuid,
  username citext,
  display_name text,
  avatar_url text,
  compatibility_score numeric,
  mutual_friends_count integer,
  crossed_paths_count integer,
  shared_interests text[]
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH user_context AS (
    SELECT interests, display_name as user_display_name
    FROM public.profiles 
    WHERE id = p_uid
    LIMIT 1
  ),
  potential_friends AS (
    SELECT DISTINCT p.id, p.username, p.display_name, p.avatar_url, p.interests
    FROM public.profiles p
    WHERE p.id != p_uid
      AND p.id NOT IN (
        SELECT friend_id FROM public.friendships WHERE user_id = p_uid
        UNION
        SELECT user_id FROM public.friendships WHERE friend_id = p_uid
      )
      AND p.username IS NOT NULL
    LIMIT 50
  ),
  mutual_friends AS (
    SELECT 
      pf.id as friend_id,
      COALESCE(COUNT(DISTINCT mf.friend_id), 0)::integer as mutual_count
    FROM potential_friends pf
    LEFT JOIN public.friendships mf1 ON mf1.user_id = p_uid
    LEFT JOIN public.friendships mf2 ON mf2.user_id = pf.id AND mf2.friend_id = mf1.friend_id
    LEFT JOIN public.friendships mf ON mf.friend_id = mf2.friend_id
    GROUP BY pf.id
  )
  SELECT 
    pf.id as user_id,
    pf.username,
    pf.display_name,
    pf.avatar_url,
    ROUND(
      CASE 
        WHEN uc.interests IS NOT NULL AND pf.interests IS NOT NULL 
        THEN (
          2.0 * COALESCE(
            array_length(
              ARRAY(SELECT unnest(uc.interests) INTERSECT SELECT unnest(pf.interests)), 1
            ), 0
          )::numeric / GREATEST(
            array_length(uc.interests, 1) + array_length(pf.interests, 1), 1
          )
        )
        ELSE 0.1
      END, 3
    ) as compatibility_score,
    COALESCE(mf.mutual_count, 0) as mutual_friends_count,
    0 as crossed_paths_count, -- Placeholder for now
    COALESCE(
      ARRAY(SELECT unnest(uc.interests) INTERSECT SELECT unnest(pf.interests)), 
      ARRAY[]::text[]
    ) as shared_interests
  FROM potential_friends pf
  CROSS JOIN user_context uc
  LEFT JOIN mutual_friends mf ON mf.friend_id = pf.id
  WHERE (
    uc.interests IS NOT NULL AND pf.interests IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM unnest(uc.interests) ui
      WHERE ui = ANY(pf.interests)
    )
  )
  ORDER BY compatibility_score DESC, mutual_friends_count DESC
  LIMIT limit_n;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.suggest_friends(uuid, int) TO authenticated;