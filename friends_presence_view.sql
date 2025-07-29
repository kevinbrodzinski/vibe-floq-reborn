/*───────────────────────────────────────────────────────────────
  View: v_friends_with_presence
  – one row per *accepted* friend of the current user
  – joins profile + live-presence data
  – exposes a simple friend-centric shape for the UI
────────────────────────────────────────────────────────────────*/
CREATE OR REPLACE VIEW public.v_friends_with_presence AS
WITH me AS (
  SELECT auth.uid() AS uid
)
SELECT
  /* who   */
  CASE WHEN f.user_low = me.uid
       THEN f.user_high
       ELSE f.user_low
  END                               AS friend_id,

  /* profile info */
  p.display_name,
  p.username,
  p.avatar_url,

  /* live-presence */
  (pr.profile_id IS NOT NULL)       AS online,
  pr.started_at,
  pr.vibe_tag,
  pr.lat,
  pr.lng,

  /* extra state – handy for the UI / hooks */
  f.friend_state
FROM   me
JOIN   public.friendships         f  ON me.uid IN (f.user_low, f.user_high)
                                    AND f.friend_state = 'accepted'
JOIN   public.profiles            p  ON p.id = CASE
                                                 WHEN f.user_low = me.uid
                                                 THEN f.user_high
                                                 ELSE f.user_low
                                               END
LEFT   JOIN public.presence       pr ON pr.profile_id = p.id;