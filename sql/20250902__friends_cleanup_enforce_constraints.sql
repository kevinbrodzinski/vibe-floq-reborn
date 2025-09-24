BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) Enforce canonical edge ordering in friendships
--    (ensure all rows are normalized and then guard future writes)
-- ─────────────────────────────────────────────────────────────────────────────

-- Backfill and normalize any historical rows (defensive; no-op if already normalized).
WITH bad AS (
  SELECT profile_low, profile_high
  FROM public.friendships
  WHERE profile_low > profile_high
)
UPDATE public.friendships f
SET profile_low  = LEAST(f.profile_low,  f.profile_high),
    profile_high = GREATEST(f.profile_low, f.profile_high)
WHERE (f.profile_low, f.profile_high) IN (SELECT profile_low, profile_high FROM bad);

-- Add CHECK constraint (conditional).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'friendships_low_high_order'
      AND conrelid = 'public.friendships'::regclass
  ) THEN
    EXECUTE 'ALTER TABLE public.friendships
             ADD CONSTRAINT friendships_low_high_order
             CHECK (profile_low <= profile_high)';
  END IF;
END$$;

-- Make sure unique constraint exists (Phase 2 created an index; enforce uniqueness formally).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'friendships_low_high_unique'
      AND conrelid = 'public.friendships'::regclass
  ) THEN
    EXECUTE 'ALTER TABLE public.friendships
             ADD CONSTRAINT friendships_low_high_unique
             UNIQUE (profile_low, profile_high)';
  END IF;
END$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) Ensure friend_requests has a true uniqueness guarantee for ON CONFLICT
-- ─────────────────────────────────────────────────────────────────────────────

-- We want at most one directed request row per pair at any time (status is updated in-place).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND indexname='friend_requests_dir_unique'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX friend_requests_dir_unique
             ON public.friend_requests (profile_id, other_profile_id)';
  END IF;
END$$;

-- Optional hygiene: collapse duplicate legacy rows if they exist (keep the newest).
WITH ranked AS (
  SELECT profile_id, other_profile_id, status, created_at, responded_at,
         ROW_NUMBER() OVER (PARTITION BY profile_id, other_profile_id ORDER BY created_at DESC) AS rn
  FROM public.friend_requests
)
DELETE FROM public.friend_requests fr
USING ranked r
WHERE fr.profile_id = r.profile_id
  AND fr.other_profile_id = r.other_profile_id
  AND r.rn > 1;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) Finalize the friends view: drop legacy 'state' alias; keep only 'friend_state'
-- ─────────────────────────────────────────────────────────────────────────────

DROP VIEW IF EXISTS public.v_friends_with_presence CASCADE;

CREATE VIEW public.v_friends_with_presence AS
WITH me AS (SELECT auth.uid() AS uid)

-- accepted friends (undirected)
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

-- outgoing pending
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

-- incoming pending
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

-- ─────────────────────────────────────────────────────────────────────────────
-- 4) Tighten RPCs: remove stale pending rows on accept; ensure idempotency
-- ─────────────────────────────────────────────────────────────────────────────

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
  IF me IS NULL THEN RAISE EXCEPTION 'auth.uid() is NULL (not authenticated)'; END IF;
  IF _from IS NULL THEN RAISE EXCEPTION 'from cannot be NULL'; END IF;
  IF me = _from THEN RAISE EXCEPTION 'cannot accept your own request'; END IF;

  UPDATE public.friend_requests r
     SET status = 'accepted', responded_at = now()
   WHERE r.profile_id = _from
     AND r.other_profile_id = me
     AND r.status = 'pending'
  RETURNING 1 INTO touched;

  IF touched = 0 THEN
    -- Nothing to accept (idempotent): if already friends, just return.
    SELECT (u.low), (u.high) INTO low, high
    FROM public.uuid_pair_low_high(me, _from) AS u;

    IF EXISTS (SELECT 1 FROM public.friendships f
               WHERE f.profile_low = low AND f.profile_high = high
                 AND f.friend_state = 'accepted') THEN
      RETURN;
    END IF;
  END IF;

  SELECT (u.low), (u.high) INTO low, high
  FROM public.uuid_pair_low_high(me, _from) AS u;

  INSERT INTO public.friendships (profile_low, profile_high, friend_state, created_at, responded_at)
  VALUES (low, high, 'accepted', now(), now())
  ON CONFLICT (profile_low, profile_high)
  DO UPDATE SET friend_state = EXCLUDED.friend_state,
                responded_at = EXCLUDED.responded_at;

  -- Hygiene: remove any stale pending in either direction for this pair.
  DELETE FROM public.friend_requests r
  WHERE (r.profile_id = me AND r.other_profile_id = _from)
     OR (r.profile_id = _from AND r.other_profile_id = me);
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_friend_request(uuid) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5) Remove Phase-1 temporary compat view (only after code is migrated)
-- ─────────────────────────────────────────────────────────────────────────────

DROP VIEW IF EXISTS public.friendships_user_compat;

COMMIT;