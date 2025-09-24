/* ------------------------------------------------------------------
   2025-08-05  –  Compatibility layer for user_low/user_high
   Purpose: expose profile_low / profile_high so all higher-level
            (v_friend_*) views can migrate without touching the
            underlying friendships table yet.
-------------------------------------------------------------------*/

-- 1. Drop old view safely if you re-run migration
DROP VIEW IF EXISTS public.friendships_v CASCADE;

-- 2. Core view
CREATE OR REPLACE VIEW public.friendships_v
AS
SELECT
  user_low  AS profile_low,
  user_high AS profile_high,
  friend_state,
  created_at,
  responded_at,
  is_close
FROM public.friendships;

COMMENT ON VIEW public.friendships_v IS
'Compatibility view exposing profile_low/profile_high while friendships still stores user_low/user_high';

-- 3. Flat helper (optional but handy for simple joins)
DROP VIEW IF EXISTS public.v_friends_flat CASCADE;

CREATE OR REPLACE VIEW public.v_friends_flat
AS
SELECT
  /* "me" is always the caller – determined in outer queries via RLS */
  LEAST(profile_low,  profile_high)     AS profile_low,
  GREATEST(profile_low, profile_high)   AS profile_high,
  friend_state,
  created_at,
  responded_at,
  is_close
FROM public.friendships_v;

COMMENT ON VIEW public.v_friends_flat IS
'Helper view: one row per friendship with sorted ids for easier joins';

-- 4. Grant select to anon / authenticated if your RLS policies rely on it
GRANT SELECT ON public.friendships_v  TO authenticated;
GRANT SELECT ON public.v_friends_flat TO authenticated;

/* ------------------------------------------------------------------
   Re-create v_friends_with_presence
   - Same column list / order as legacy view
   - Uses friendships_v instead of friendships
-------------------------------------------------------------------*/

CREATE OR REPLACE VIEW public.v_friends_with_presence
            (friend_id,
             display_name,
             username,
             avatar_url,
             started_at,
             vibe_tag,
             online,
             friend_state,
             created_at,
             responded_at,
             is_outgoing_request,
             is_incoming_request)
AS
/* ────────────────────────────────────────────────────────────────
   1. Accepted friendships (via compatibility view)
   ────────────────────────────────────────────────────────────────*/
SELECT
  CASE WHEN fv.profile_low = auth.uid()
       THEN fv.profile_high
       ELSE fv.profile_low END                    AS friend_id,
  p.display_name,
  p.username,
  p.avatar_url,
  pr.started_at,
  pr.vibe_tag,
  (pr.profile_id IS NOT NULL)                    AS online,
  'accepted'::text                               AS friend_state,
  fv.created_at,
  fv.responded_at,
  FALSE                                          AS is_outgoing_request,
  FALSE                                          AS is_incoming_request
FROM   public.friendships_v fv
JOIN   public.profiles   p
       ON p.id = CASE WHEN fv.profile_low = auth.uid()
                     THEN fv.profile_high ELSE fv.profile_low END
LEFT  JOIN public.presence pr ON pr.profile_id = p.id
WHERE  (fv.profile_low  = auth.uid() OR fv.profile_high = auth.uid())
  AND  fv.friend_state = 'accepted'

UNION ALL
/* ────────────────────────────────────────────────────────────────
   2. Outgoing pending requests (I sent)
   ────────────────────────────────────────────────────────────────*/
SELECT
  fr.other_profile_id                           AS friend_id,
  p.display_name,
  p.username,
  p.avatar_url,
  pr.started_at,
  pr.vibe_tag,
  (pr.profile_id IS NOT NULL)                   AS online,
  fr.status                                     AS friend_state,  -- 'pending'
  fr.created_at,
  fr.responded_at,
  TRUE                                          AS is_outgoing_request,
  FALSE                                         AS is_incoming_request
FROM   public.friend_requests fr
JOIN   public.profiles   p ON p.id = fr.other_profile_id
LEFT  JOIN public.presence pr ON pr.profile_id = p.id
WHERE  fr.profile_id = auth.uid()
  AND  fr.status = 'pending'

UNION ALL
/* ────────────────────────────────────────────────────────────────
   3. Incoming pending requests (they sent)
   ────────────────────────────────────────────────────────────────*/
SELECT
  fr.profile_id                                 AS friend_id,
  p.display_name,
  p.username,
  p.avatar_url,
  pr.started_at,
  pr.vibe_tag,
  (pr.profile_id IS NOT NULL)                   AS online,
  fr.status                                     AS friend_state,  -- 'pending'
  fr.created_at,
  fr.responded_at,
  FALSE                                         AS is_outgoing_request,
  TRUE                                          AS is_incoming_request
FROM   public.friend_requests fr
JOIN   public.profiles   p ON p.id = fr.profile_id
LEFT  JOIN public.presence pr ON pr.profile_id = p.id
WHERE  fr.other_profile_id = auth.uid()
  AND  fr.status = 'pending';