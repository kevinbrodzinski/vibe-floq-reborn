-- Create a comprehensive view that combines friendships and friend_requests with proper direction
DROP VIEW IF EXISTS public.v_friends_with_presence CASCADE;

CREATE VIEW public.v_friends_with_presence AS
-- Accepted friendships (bidirectional, from friendships table)
SELECT
  CASE WHEN f.user_low = auth.uid() THEN f.user_high ELSE f.user_low END AS friend_id,
  p.display_name,
  p.username,
  p.avatar_url,
  pr.started_at,
  pr.vibe_tag,
  (pr.profile_id IS NOT NULL) AS online,
  'accepted'::text AS friend_state,
  f.created_at,
  f.responded_at,
  false AS is_outgoing_request,  -- not applicable for accepted
  false AS is_incoming_request   -- not applicable for accepted
FROM public.friendships f
JOIN public.profiles p ON p.id = CASE 
  WHEN f.user_low = auth.uid() THEN f.user_high 
  ELSE f.user_low 
END
LEFT JOIN public.presence pr ON pr.profile_id = p.id
WHERE auth.uid() IN (f.user_low, f.user_high)
  AND f.friend_state = 'accepted'

UNION ALL

-- Outgoing pending requests (from friend_requests table)
SELECT
  fr.other_profile_id AS friend_id,
  p.display_name,
  p.username,
  p.avatar_url,
  pr.started_at,
  pr.vibe_tag,
  (pr.profile_id IS NOT NULL) AS online,
  fr.status AS friend_state,
  fr.created_at,
  fr.responded_at,
  true AS is_outgoing_request,
  false AS is_incoming_request
FROM public.friend_requests fr
JOIN public.profiles p ON p.id = fr.other_profile_id
LEFT JOIN public.presence pr ON pr.profile_id = p.id
WHERE fr.profile_id = auth.uid()
  AND fr.status = 'pending'

UNION ALL

-- Incoming pending requests (from friend_requests table)
SELECT
  fr.profile_id AS friend_id,
  p.display_name,
  p.username,
  p.avatar_url,
  pr.started_at,
  pr.vibe_tag,
  (pr.profile_id IS NOT NULL) AS online,
  fr.status AS friend_state,
  fr.created_at,
  fr.responded_at,
  false AS is_outgoing_request,
  true AS is_incoming_request
FROM public.friend_requests fr
JOIN public.profiles p ON p.id = fr.profile_id
LEFT JOIN public.presence pr ON pr.profile_id = p.id
WHERE fr.other_profile_id = auth.uid()
  AND fr.status = 'pending';

ALTER VIEW public.v_friends_with_presence OWNER TO postgres;