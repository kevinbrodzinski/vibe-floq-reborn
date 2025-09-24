-- Enhanced search that includes friend-request / friendship status
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
  req_status   text         -- 'none' | 'pending_out' | 'pending_in' | 'friends'
)
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  /* ---------- base discoverable rows ---------- */
  WITH base AS (
    SELECT p.*
    FROM   public.profiles p
    WHERE  p.id                      <> p_viewer_id      -- never return self
    AND   (p.username ILIKE p_query || '%'
           OR p.display_name ILIKE p_query || '%'
           OR p.username ILIKE '%' || p_query || '%'
           OR p.display_name ILIKE '%' || p_query || '%')
    ORDER  BY
         (p.username ILIKE p_query || '%') DESC,
         (p.display_name ILIKE p_query || '%') DESC,
         p.created_at DESC
    LIMIT  p_limit
  )

  /* ---------- join friend state ---------- */
  SELECT
      b.id,
      b.display_name,
      b.username,
      b.avatar_url,
      b.created_at,
      CASE
        WHEN f.profile_id IS NOT NULL                     THEN 'friends'
        WHEN fr_out.id IS NOT NULL                        THEN 'pending_out'
        WHEN fr_in.id  IS NOT NULL                        THEN 'pending_in'
        ELSE 'none'
      END AS req_status
  FROM   base b
  LEFT   JOIN public.friendships f
         ON (f.profile_id = p_viewer_id AND f.friend_id = b.id)
  LEFT   JOIN public.friend_requests fr_out
         ON (fr_out.profile_id      = p_viewer_id
             AND fr_out.other_profile_id = b.id
             AND fr_out.status      = 'pending')
  LEFT   JOIN public.friend_requests fr_in
         ON (fr_in.profile_id       = b.id
             AND fr_in.other_profile_id = p_viewer_id
             AND fr_in.status       = 'pending');
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.search_profiles_with_status(text,int,uuid) TO authenticated, anon;