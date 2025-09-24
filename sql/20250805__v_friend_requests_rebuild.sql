-- sql/20250805__v_friend_requests_rebuild.sql
BEGIN;

-- 1. Remove old view (safe because we haven't shipped yet)
DROP VIEW IF EXISTS public.v_friend_requests;

-- 2. Re-create with profile-centric columns
CREATE VIEW public.v_friend_requests AS
SELECT
  fr.id,
  fr.profile_id       AS requester_profile_id,
  fr.friend_id,
  fr.status,
  fr.created_at,
  rp.username,
  rp.display_name,
  rp.avatar_url
FROM public.friend_requests fr
LEFT JOIN public.profiles rp
  ON rp.id = fr.profile_id;

COMMIT;

-- Cleanup old views
DROP VIEW IF EXISTS public.floq_participants_legacy;
DROP VIEW IF EXISTS public.v_friend_requests;
DROP VIEW IF EXISTS public.vibes_now_user_id_bridge;