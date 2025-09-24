BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 0) Helpers
-- ─────────────────────────────────────────────────────────────────────────────

-- Normalize a pair of UUIDs into (low, high) ordering.
CREATE OR REPLACE FUNCTION public.uuid_pair_low_high(a uuid, b uuid)
RETURNS TABLE (low uuid, high uuid)
LANGUAGE sql
IMMUTABLE
STRICT
AS $$
  SELECT CASE WHEN a <= b THEN a ELSE b END AS low,
         CASE WHEN a <= b THEN b ELSE a END AS high;
$$;

COMMENT ON FUNCTION public.uuid_pair_low_high(uuid, uuid)
  IS 'Returns (low, high) such that low<=high; used to canonicalize undirected edges.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) Indexes (safe IF NOT EXISTS; all purely additive)
-- ─────────────────────────────────────────────────────────────────────────────

-- Guarantee uniqueness of a friendship edge (since we store normalized low/high).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname  = 'friendships_low_high_uq'
  ) THEN
    EXECUTE $$CREATE UNIQUE INDEX friendships_low_high_uq
             ON public.friendships (profile_low, profile_high)$$;
  END IF;
END$$;

-- Fast lookups for pending flows.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'friend_requests_outgoing_pending_idx'
  ) THEN
    EXECUTE $$CREATE INDEX friend_requests_outgoing_pending_idx
             ON public.friend_requests (profile_id) WHERE status = 'pending'$$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'friend_requests_incoming_pending_idx'
  ) THEN
    EXECUTE $$CREATE INDEX friend_requests_incoming_pending_idx
             ON public.friend_requests (other_profile_id) WHERE status = 'pending'$$;
  END IF;
END$$;

-- Presence join helper for the view (no-op if already present).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'presence_profile_id_idx'
  ) THEN
    EXECUTE $$CREATE INDEX presence_profile_id_idx
             ON public.presence (profile_id)$$;
  END IF;
END$$;

-- Optional: compatibility alias in the view for legacy callers expecting "state".
-- If you still have code reading "state", re-create the view with an alias.
-- (Skip if you already standardized on friend_state.)
DROP VIEW IF EXISTS public.v_friends_with_presence CASCADE;
CREATE VIEW public.v_friends_with_presence AS
WITH me AS (SELECT auth.uid() AS uid)

-- accepted friends
SELECT
  CASE WHEN f.profile_low = me.uid THEN f.profile_high ELSE f.profile_low END AS friend_id,
  p.display_name,
  p.username,
  p.avatar_url,
  (pr.profile_id IS NOT NULL)                           AS online,
  pr.started_at,
  pr.vibe_tag::text                                     AS vibe_tag,
  f.friend_state,
  f.friend_state                                        AS state,        -- <— legacy alias (optional)
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
  fr.status                                             AS state,        -- <— legacy alias
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
  fr.status                                             AS state,        -- <— legacy alias
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

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) RPCs (SECURITY INVOKER; RLS respected)
--    All functions are idempotent where reasonable.
-- ─────────────────────────────────────────────────────────────────────────────

-- send_friend_request: creates pending, or auto-accepts if an incoming pending exists.
CREATE OR REPLACE FUNCTION public.send_friend_request(_target uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  me   uuid := auth.uid();
  low  uuid;
  high uuid;
  already boolean;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'auth.uid() is NULL (not authenticated)';
  END IF;
  IF _target IS NULL THEN
    RAISE EXCEPTION 'target cannot be NULL';
  END IF;
  IF me = _target THEN
    RAISE EXCEPTION 'cannot send a friend request to yourself';
  END IF;

  SELECT (u.low), (u.high) INTO low, high
  FROM public.uuid_pair_low_high(me, _target) AS u;

  -- Already friends? NOP.
  SELECT TRUE INTO already
  FROM public.friendships f
  WHERE f.profile_low = low
    AND f.profile_high = high
    AND f.friend_state = 'accepted'
  LIMIT 1;

  IF already THEN
    RETURN;
  END IF;

  -- If they already asked me, accept instead of creating a duplicate pending.
  IF EXISTS (
    SELECT 1
    FROM public.friend_requests r
    WHERE r.profile_id = _target
      AND r.other_profile_id = me
      AND r.status = 'pending'
  ) THEN
    PERFORM public.accept_friend_request(_target);
    RETURN;
  END IF;

  -- Otherwise, create/ensure a pending outgoing.
  INSERT INTO public.friend_requests (profile_id, other_profile_id, status, created_at)
  VALUES (me, _target, 'pending', now())
  ON CONFLICT (profile_id, other_profile_id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_friend_request(uuid) TO authenticated;

-- accept_friend_request: turns pending into accepted + inserts/upsserts into friendships.
CREATE OR REPLACE FUNCTION public.accept_friend_request(_from uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  me   uuid := auth.uid();
  low  uuid;
  high uuid;
  touched int := 0;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'auth.uid() is NULL (not authenticated)';
  END IF;
  IF _from IS NULL THEN
    RAISE EXCEPTION 'from cannot be NULL';
  END IF;
  IF me = _from THEN
    RAISE EXCEPTION 'cannot accept your own request';
  END IF;

  UPDATE public.friend_requests r
     SET status = 'accepted', responded_at = now()
   WHERE r.profile_id = _from
     AND r.other_profile_id = me
     AND r.status = 'pending'
  RETURNING 1 INTO touched;

  -- If nothing to accept, be idempotent.
  IF touched = 0 THEN
    RETURN;
  END IF;

  SELECT (u.low), (u.high) INTO low, high
  FROM public.uuid_pair_low_high(me, _from) AS u;

  INSERT INTO public.friendships (profile_low, profile_high, friend_state, created_at, responded_at)
  VALUES (low, high, 'accepted', now(), now())
  ON CONFLICT (profile_low, profile_high)
  DO UPDATE SET friend_state = EXCLUDED.friend_state,
                responded_at = EXCLUDED.responded_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_friend_request(uuid) TO authenticated;

-- decline_friend_request: mark incoming pending as declined.
CREATE OR REPLACE FUNCTION public.decline_friend_request(_from uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  me uuid := auth.uid();
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'auth.uid() is NULL (not authenticated)';
  END IF;
  IF _from IS NULL THEN
    RAISE EXCEPTION 'from cannot be NULL';
  END IF;

  UPDATE public.friend_requests r
     SET status = 'declined', responded_at = now()
   WHERE r.profile_id = _from
     AND r.other_profile_id = me
     AND r.status = 'pending';
END;
$$;

GRANT EXECUTE ON FUNCTION public.decline_friend_request(uuid) TO authenticated;

-- cancel_friend_request: remove my outgoing pending.
CREATE OR REPLACE FUNCTION public.cancel_friend_request(_to uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  me uuid := auth.uid();
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'auth.uid() is NULL (not authenticated)';
  END IF;
  IF _to IS NULL THEN
    RAISE EXCEPTION 'to cannot be NULL';
  END IF;

  DELETE FROM public.friend_requests r
   WHERE r.profile_id = me
     AND r.other_profile_id = _to
     AND r.status = 'pending';
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_friend_request(uuid) TO authenticated;

-- remove_friend: delete the accepted edge (idempotent).
CREATE OR REPLACE FUNCTION public.remove_friend(_friend uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  me   uuid := auth.uid();
  low  uuid;
  high uuid;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'auth.uid() is NULL (not authenticated)';
  END IF;
  IF _friend IS NULL THEN
    RAISE EXCEPTION 'friend cannot be NULL';
  END IF;

  SELECT (u.low), (u.high) INTO low, high
  FROM public.uuid_pair_low_high(me, _friend) AS u;

  DELETE FROM public.friendships f
   WHERE f.profile_low = low
     AND f.profile_high = high;
END;
$$;

GRANT EXECUTE ON FUNCTION public.remove_friend(uuid) TO authenticated;

COMMIT;