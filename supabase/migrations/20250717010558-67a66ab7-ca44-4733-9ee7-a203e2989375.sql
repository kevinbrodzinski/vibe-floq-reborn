-- Drop the existing function first
DROP FUNCTION IF EXISTS public.suggest_friends(uuid, integer);

-- Re-create "suggest_friends" with fully-qualified columns
-- and a fallback when no shared-interest matches exist.

CREATE OR REPLACE FUNCTION public.suggest_friends(
  p_user_id uuid,
  p_limit   int DEFAULT 10
) RETURNS TABLE (
  id           uuid,
  username     text,
  display_name text,
  avatar_url   text,
  shared_tags  int      -- number of matching interests
) LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  ------------------------------------------------------------------------
  -- 1 ▸ user_context – interests of the requesting user
  ------------------------------------------------------------------------
  WITH user_context AS (
    SELECT interests
    FROM   profiles
    WHERE  id = p_user_id
  ),

  ------------------------------------------------------------------------
  -- 2 ▸ interest_matches – other users who share ≥1 tag
  ------------------------------------------------------------------------
  interest_matches AS (
    SELECT
      p.id,
      p.username,
      p.display_name,
      p.avatar_url,
      CARDINALITY(   -- number of overlapping tags
        ARRAY(
          SELECT unnest(p.interests)
          INTERSECT
          SELECT unnest(u.interests)
        )
      ) AS shared_tags
    FROM   profiles p
           CROSS JOIN user_context u
    WHERE  p.id <> p_user_id
      AND  p.interests IS NOT NULL
      AND  u.interests IS NOT NULL
      AND  ARRAY_LENGTH(
            ARRAY(
              SELECT unnest(p.interests)
              INTERSECT
              SELECT unnest(u.interests)
            ), 1
          ) > 0
  ),

  ------------------------------------------------------------------------
  -- 3 ▸ fallback_pool – anyone except the current user, used when
  --     interest_matches is empty
  ------------------------------------------------------------------------
  fallback_pool AS (
    SELECT
      p.id,
      p.username,
      p.display_name,
      p.avatar_url,
      0 AS shared_tags
    FROM profiles p
    WHERE p.id <> p_user_id
  )

  ------------------------------------------------------------------------
  -- 4 ▸ final result
  ------------------------------------------------------------------------
  SELECT *
  FROM (
    SELECT * FROM interest_matches
    UNION ALL
    SELECT * FROM fallback_pool
  ) t
  GROUP BY id, username, display_name, avatar_url, shared_tags
  ORDER BY shared_tags DESC, display_name
  LIMIT p_limit;
END;
$$;

-- Grant execute to your anon / authenticated roles
GRANT EXECUTE ON FUNCTION public.suggest_friends(uuid,int) TO authenticated, anon;