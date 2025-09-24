BEGIN;

-- 0) Safety: drop dependent view to rebuild cleanly
DROP VIEW IF EXISTS public.v_friends_with_presence CASCADE;

-- 1) UUID safety helper
CREATE OR REPLACE FUNCTION public.safe_uuid(p_text text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
RETURNS NULL ON NULL INPUT
AS $$
  SELECT CASE
           WHEN p_text IS NULL THEN NULL
           WHEN trim(lower(p_text)) IN ('', 'null', 'undefined', 'nan') THEN NULL
           ELSE p_text::uuid
         END
$$;

COMMENT ON FUNCTION public.safe_uuid(text)
  IS 'Cast helper: returns NULL for common sentinel strings; otherwise casts to uuid.';

-- 2) Rebuild v_friends_with_presence on profile_low/profile_high (canonical)
CREATE VIEW public.v_friends_with_presence AS
WITH me AS (SELECT auth.uid() AS uid)

-- accepted friends (undirected edge, normalized by low/high)
SELECT
  CASE WHEN f.profile_low = me.uid THEN f.profile_high ELSE f.profile_low END AS friend_id,
  p.display_name,
  p.username,
  p.avatar_url,
  (pr.profile_id IS NOT NULL)                           AS online,
  pr.started_at,
  pr.vibe_tag::text                                     AS vibe_tag,
  f.friend_state,
  f.created_at,
  f.responded_at,
  FALSE                                                 AS is_outgoing_request,
  FALSE                                                 AS is_incoming_request
FROM   me
JOIN   public.friendships f
       ON me.uid IN (f.profile_low, f.profile_high)
      AND f.friend_state = 'accepted'
JOIN   public.profiles p
       ON p.id = CASE WHEN f.profile_low = me.uid THEN f.profile_high ELSE f.profile_low END
LEFT   JOIN public.presence pr
       ON pr.profile_id = p.id

UNION ALL

-- outgoing pending requests
SELECT
  fr.other_profile_id                                   AS friend_id,
  p.display_name,
  p.username,
  p.avatar_url,
  (pr.profile_id IS NOT NULL)                           AS online,
  pr.started_at,
  pr.vibe_tag::text                                     AS vibe_tag,
  fr.status                                             AS friend_state,
  fr.created_at,
  fr.responded_at,
  TRUE                                                  AS is_outgoing_request,
  FALSE                                                 AS is_incoming_request
FROM   me
JOIN   public.friend_requests fr
       ON fr.profile_id = me.uid AND fr.status = 'pending'
JOIN   public.profiles p
       ON p.id = fr.other_profile_id
LEFT   JOIN public.presence pr
       ON pr.profile_id = p.id

UNION ALL

-- incoming pending requests
SELECT
  fr.profile_id                                         AS friend_id,
  p.display_name,
  p.username,
  p.avatar_url,
  (pr.profile_id IS NOT NULL)                           AS online,
  pr.started_at,
  pr.vibe_tag::text                                     AS vibe_tag,
  fr.status                                             AS friend_state,
  fr.created_at,
  fr.responded_at,
  FALSE                                                 AS is_outgoing_request,
  TRUE                                                  AS is_incoming_request
FROM   me
JOIN   public.friend_requests fr
       ON fr.other_profile_id = me.uid AND fr.status = 'pending'
JOIN   public.profiles p
       ON p.id = fr.profile_id
LEFT   JOIN public.presence pr
       ON pr.profile_id = p.id
;

ALTER VIEW public.v_friends_with_presence OWNER TO postgres;
GRANT SELECT ON public.v_friends_with_presence TO authenticated;

-- 3) Temporary legacy-compat mapping for any leftover SQL still using user_low/user_high
DROP VIEW IF EXISTS public.friendships_user_compat;
CREATE VIEW public.friendships_user_compat AS
SELECT
  profile_low AS user_low,
  profile_high AS user_high,
  friend_state,
  created_at,
  responded_at,
  is_close
FROM public.friendships;

COMMENT ON VIEW public.friendships_user_compat
  IS 'Legacy-compat mapping exposing user_low/user_high from friendships(profile_low/profile_high).';

COMMIT;