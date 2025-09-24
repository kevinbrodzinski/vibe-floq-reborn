BEGIN;

-- Create enum type for req_status to get TypeScript literal unions
CREATE TYPE public.friend_req_status AS ENUM ('none', 'pending_out', 'pending_in', 'friends', 'blocked');

-- Fix the main function with proper aliases, precedence, privacy guard and full-text search
CREATE OR REPLACE FUNCTION public.search_profiles_with_status (
  p_query      text,
  p_limit      int           DEFAULT 20,
  p_viewer_id  uuid          DEFAULT auth.uid()
)
RETURNS TABLE (
  id           uuid,
  display_name text,
  username     text,
  avatar_url   text,
  created_at   timestamptz,
  req_status   friend_req_status
)
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Guard against anonymous users
  WITH viewer_check AS (
    SELECT COALESCE(p_viewer_id, '00000000-0000-0000-0000-000000000000'::uuid) AS v_uid
  ),
  
  -- Base discoverable profiles
  base AS (
    SELECT p.*, v.v_uid
    FROM   public.profiles p
    CROSS JOIN viewer_check v
    WHERE  p.id <> v.v_uid                    -- never return self
    AND    p.is_searchable                    -- keep privacy
    AND    length(trim(p_query)) > 1          -- prevent empty query matches
    AND   (
            -- Full-text or trigram / prefix
            p.search_vec @@ plainto_tsquery('simple', p_query)
         OR p.username     ILIKE p_query || '%'
         OR p.display_name ILIKE p_query || '%'
         OR p.username % p_query
         OR p.display_name % p_query
          )
    ORDER  BY
         (p.username ILIKE p_query || '%') DESC,
         (p.display_name ILIKE p_query || '%') DESC,
         p.created_at DESC
    LIMIT  LEAST(p_limit, 50)               -- clamp limit for safety
  )

  -- Join friend state with proper precedence
  SELECT
      b.id,
      b.display_name,
      b.username,
      b.avatar_url,
      b.created_at,
      CASE
        WHEN friendship.friend_state = 'blocked'  THEN 'blocked'::friend_req_status
        WHEN friendship.friend_state = 'accepted' THEN 'friends'::friend_req_status
        WHEN fr_out.id IS NOT NULL                THEN 'pending_out'::friend_req_status
        WHEN fr_in.id  IS NOT NULL                THEN 'pending_in'::friend_req_status
        ELSE 'none'::friend_req_status
      END AS req_status
  FROM   base b
  
  -- Single friendship lookup with proper alias
  LEFT JOIN LATERAL (
    SELECT friend_state
    FROM   public.friendships f
    WHERE  (LEAST(f.user_low, f.user_high),
            GREATEST(f.user_low, f.user_high))
           = (LEAST(b.v_uid, b.id), GREATEST(b.v_uid, b.id))
    LIMIT 1
  ) friendship ON TRUE

  -- Check outgoing requests only if not already friends/blocked
  LEFT JOIN public.friend_requests fr_out
    ON fr_out.profile_id       = b.v_uid
   AND fr_out.other_profile_id = b.id
   AND fr_out.status           = 'pending'
   AND friendship.friend_state IS NULL

  -- Check incoming requests only if not already friends/blocked
  LEFT JOIN public.friend_requests fr_in
    ON fr_in.profile_id        = b.id
   AND fr_in.other_profile_id  = b.v_uid
   AND fr_in.status            = 'pending'
   AND friendship.friend_state IS NULL
   
  WHERE b.v_uid != '00000000-0000-0000-0000-000000000000'::uuid; -- exclude anonymous users
$$;

-- Add function comment explaining status precedence
COMMENT ON FUNCTION public.search_profiles_with_status(text, int, uuid) IS 
'Search profiles with relationship status. Precedence: blocked > friends > pending_out > pending_in > none';

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.search_profiles_with_status(text,int,uuid) TO authenticated, anon;

COMMIT;