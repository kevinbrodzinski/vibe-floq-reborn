-- Drop the old broken function
DROP FUNCTION IF EXISTS public.get_friends_with_presence(uuid);

-- Create the corrected function
CREATE OR REPLACE FUNCTION public.get_friends_with_presence()
RETURNS TABLE (
  friend_id     uuid,
  display_name  text,
  avatar_url    text,
  username      citext,
  bio           text,
  vibe_tag      vibe_enum,
  started_at    timestamptz,
  online        boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
/*------------------------------------------------------------------------
  Friends are stored symmetrically in `friends`
    user_a    <->  user_b     (status = 'accepted')

  For the *current* auth.uid() we:
  1.  Pick the opposite column to get the friend's id
  2.  Bring in profile information
  3.  Left-join the live-vibe view (vibes_now) to get vibe & started_at
  4.  Compute an "online" boolean (vibe row in last 2 h)
------------------------------------------------------------------------*/
WITH me AS (
  SELECT auth.uid() AS uid
)
SELECT
  x.friend_id,
  pr.display_name,
  pr.avatar_url,
  pr.username,
  pr.bio,
  vn.vibe_tag,
  vn.started_at,
  vn.started_at IS NOT NULL
      AND vn.started_at > (now() - interval '2 hours') AS online
FROM friends f
JOIN me               ON (f.status = 'accepted' AND (f.user_a = me.uid OR f.user_b = me.uid))

-- 1️⃣  figure out the other person
CROSS JOIN LATERAL (
  SELECT CASE WHEN f.user_a = me.uid THEN f.user_b ELSE f.user_a END AS friend_id
) AS x

-- 2️⃣  profile
JOIN profiles pr      ON pr.id = x.friend_id

-- 3️⃣  vibe row (may be NULL) - fallback to user_vibe_states if vibes_now is empty
LEFT JOIN LATERAL (
  SELECT vibe AS vibe_tag, updated_at AS started_at
  FROM   vibes_now
  WHERE  user_id = x.friend_id
  UNION ALL
  SELECT vibe_tag, started_at
  FROM   user_vibe_states
  WHERE  user_id = x.friend_id
    AND  active = true
  LIMIT 1
) vn ON TRUE

ORDER BY online DESC, pr.display_name;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_friends_with_presence() TO authenticated;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS friends_user_a_idx ON friends (user_a) WHERE status = 'accepted';
CREATE INDEX IF NOT EXISTS friends_user_b_idx ON friends (user_b) WHERE status = 'accepted';
CREATE INDEX IF NOT EXISTS vibes_now_user_id_idx ON vibes_now(user_id);
CREATE INDEX IF NOT EXISTS user_vibe_states_user_id_active_idx ON user_vibe_states(user_id) WHERE active = true;