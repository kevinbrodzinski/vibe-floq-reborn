-- Update v_friends_with_presence view to match frontend UnifiedRow structure
-- Replace the old view with improved logic using CTE

-- 1️⃣  Replace the old view (and anything depending on it)
DROP VIEW IF EXISTS public.v_friends_with_presence CASCADE;

-- 2️⃣  Re-create it with the precise column names / types
CREATE VIEW public.v_friends_with_presence AS
WITH mutuals AS (
  SELECT  user_low,
          user_high,
          friend_state,
          created_at,
          responded_at
  FROM    public.friendships
  WHERE   friend_state IN ('accepted','pending','blocked')   -- keep only states the UI cares about
    AND   auth.uid() IN (user_low, user_high)                -- caller is part of the pair
)
SELECT
  /* ---------- identity (other side of the friendship) ------------ */
  CASE
    WHEN m.user_low = auth.uid() THEN m.user_high
    ELSE                             m.user_low
  END                                           AS friend_id,

  /* ---------- profile details ------------------------------------ */
  p.display_name,
  p.username,
  p.avatar_url,

  /* ---------- presence ------------------------------------------- */
  vn.updated_at                                 AS started_at,   -- last ping
  vn.vibe::text                                 AS vibe_tag,
  (vn.expires_at > now())                       AS online,

  /* ---------- friendship metadata -------------------------------- */
  m.friend_state,
  m.created_at,
  m.responded_at

FROM     mutuals            AS m
JOIN     public.profiles    AS p  ON p.id = CASE
                                              WHEN m.user_low = auth.uid() THEN m.user_high
                                              ELSE                              m.user_low
                                            END
LEFT JOIN public.vibes_now  AS vn ON vn.profile_id = p.id;   -- may be NULL

-- Grant access to authenticated users
GRANT SELECT ON public.v_friends_with_presence TO authenticated;