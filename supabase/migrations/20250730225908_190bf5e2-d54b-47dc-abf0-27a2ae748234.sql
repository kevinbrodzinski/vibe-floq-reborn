-- Restore v_friends_with_presence view for useUnifiedFriends hook
-- This view provides the UnifiedRow structure expected by the frontend

CREATE OR REPLACE VIEW public.v_friends_with_presence AS
SELECT
  CASE
    WHEN f.user_low = auth.uid() THEN f.user_high
    ELSE                              f.user_low
  END                                   AS friend_id,

  p.display_name,
  p.username,
  p.avatar_url,

  vn.updated_at                         AS started_at,
  vn.vibe::text                         AS vibe_tag,
  (vn.expires_at > now())               AS online,

  f.friend_state,
  f.created_at,
  f.responded_at

FROM public.friendships  AS f
JOIN public.profiles     AS p
  ON p.id = CASE
              WHEN f.user_low = auth.uid() THEN f.user_high
              ELSE                              f.user_low
            END
LEFT JOIN public.vibes_now AS vn
  ON vn.profile_id = p.id
WHERE auth.uid() IN (f.user_low, f.user_high);

-- Grant access to authenticated users
GRANT SELECT ON public.v_friends_with_presence TO authenticated;