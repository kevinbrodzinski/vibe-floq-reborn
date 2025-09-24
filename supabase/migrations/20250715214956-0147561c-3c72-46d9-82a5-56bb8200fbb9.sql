-- Fix profiles RLS and suggest_friends function with tweaks

-- Enable RLS on profiles (explicit)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create narrow self-access policy (SELECT, UPDATE, INSERT only - no DELETE)
DROP POLICY IF EXISTS profiles_self_rw ON public.profiles;

-- Create separate policies for each operation type
CREATE POLICY profiles_self_select
  ON public.profiles
  FOR SELECT
  USING (id = auth.uid());

CREATE POLICY profiles_self_update
  ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY profiles_self_insert
  ON public.profiles
  FOR INSERT
  WITH CHECK (id = auth.uid());

-- Drop existing function first to change return type
DROP FUNCTION IF EXISTS public.suggest_friends(uuid, integer);

-- Create suggest_friends function as VOLATILE (not STABLE)
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
  reasoning jsonb
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH user_context AS (
    SELECT interests, display_name
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
    jsonb_build_object(
      'shared_interests', COALESCE(
        ARRAY(SELECT unnest(uc.interests) INTERSECT SELECT unnest(pf.interests)), 
        ARRAY[]::text[]
      )
    ) as reasoning
  FROM potential_friends pf
  CROSS JOIN user_context uc
  WHERE (
    uc.interests IS NOT NULL AND pf.interests IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM unnest(uc.interests) ui
      WHERE ui = ANY(pf.interests)
    )
  )
  ORDER BY compatibility_score DESC
  LIMIT limit_n;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.suggest_friends(uuid, int) TO authenticated;