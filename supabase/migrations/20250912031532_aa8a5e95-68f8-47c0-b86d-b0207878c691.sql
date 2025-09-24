-- Rally inbox migration-safe bundle with proper type casting
-- 1) Safety tables (idempotent)

-- track last seen per (profile,rally) – used to compute unread
CREATE TABLE IF NOT EXISTS public.rally_last_seen (
  profile_id uuid NOT NULL,
  rally_id   text NOT NULL,  -- TEXT to match rally_threads.rally_id
  last_seen  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, rally_id)
);

-- helpful indexes if you don't already have them
CREATE INDEX IF NOT EXISTS idx_rallies_expires       ON public.rallies(expires_at);
CREATE INDEX IF NOT EXISTS idx_rally_invites_rally   ON public.rally_invites(rally_id);
CREATE INDEX IF NOT EXISTS idx_rally_invites_to      ON public.rally_invites(to_profile);
CREATE INDEX IF NOT EXISTS idx_rally_threads_rally   ON public.rally_threads(rally_id);
CREATE INDEX IF NOT EXISTS idx_rally_messages_thread ON public.rally_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_rally_messages_created ON public.rally_messages(created_at);

-- 2) Membership helper (used by everything)

CREATE OR REPLACE FUNCTION public.is_rally_member(_rally text, _uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.rallies r
    LEFT JOIN public.rally_invites ri
      ON ri.rally_id = r.id AND ri.to_profile = _uid
    WHERE r.id::text = _rally
      AND (_uid = r.creator_id OR ri.to_profile = _uid)
  );
$$;

REVOKE ALL ON FUNCTION public.is_rally_member(text, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_rally_member(text, uuid) TO authenticated, anon;

-- 3) Inbox function (no fragile columns; fast even without MV)

CREATE OR REPLACE FUNCTION public.get_rally_inbox(_uid uuid DEFAULT auth.uid())
RETURNS TABLE (
  thread_id        uuid,
  rally_id         text,
  title            text,
  participants     text[],
  last_message_at  timestamptz,
  last_seen        timestamptz,
  unread_count     integer,
  first_unread_at  timestamptz,
  expires_at       timestamptz,
  status           text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH my_membership AS (
    SELECT DISTINCT r.id::text as rally_id
    FROM public.rallies r
    LEFT JOIN public.rally_invites ri
      ON ri.rally_id = r.id AND ri.to_profile = _uid
    WHERE _uid = r.creator_id OR ri.to_profile = _uid
  ),
  threads AS (
    SELECT t.id as thread_id, t.rally_id, t.title
    FROM public.rally_threads t
    JOIN my_membership m ON m.rally_id = t.rally_id
  ),
  participants AS (
    -- build a participants list from creator + invited (in case you don't have t.participants)
    SELECT
      r.id::text as rally_id,
      array_remove(
        array_agg(DISTINCT COALESCE(ri.to_profile::text, r.creator_id::text)),
        null
      ) as participants
    FROM public.rallies r
    LEFT JOIN public.rally_invites ri ON ri.rally_id = r.id
    GROUP BY r.id
  ),
  msgs AS (
    SELECT
      t.thread_id,
      max(m.created_at) as last_message_at
    FROM threads t
    LEFT JOIN public.rally_messages m ON m.thread_id = t.thread_id
    GROUP BY t.thread_id
  ),
  seen AS (
    SELECT
      ls.rally_id,
      ls.last_seen
    FROM public.rally_last_seen ls
    WHERE ls.profile_id = _uid
  ),
  unread AS (
    -- per thread, count unread and min(created_at) > last_seen
    SELECT
      t.thread_id,
      count(*) FILTER (WHERE m.created_at > COALESCE(s.last_seen, to_timestamp(0))) as unread_count,
      min(m.created_at) FILTER (WHERE m.created_at > COALESCE(s.last_seen, to_timestamp(0))) as first_unread_at
    FROM threads t
    LEFT JOIN public.rally_messages m ON m.thread_id = t.thread_id
    LEFT JOIN seen s ON s.rally_id = t.rally_id
    GROUP BY t.thread_id
  )
  SELECT
    t.thread_id,
    t.rally_id,
    t.title,
    p.participants,
    COALESCE(ms.last_message_at, r.created_at) as last_message_at,
    s.last_seen,
    COALESCE(u.unread_count, 0) as unread_count,
    u.first_unread_at,
    r.expires_at,
    r.status
  FROM threads t
  JOIN public.rallies r ON r.id::text = t.rally_id
  LEFT JOIN participants p ON p.rally_id = t.rally_id
  LEFT JOIN msgs ms ON ms.thread_id = t.thread_id
  LEFT JOIN seen s ON s.rally_id = t.rally_id
  LEFT JOIN unread u ON u.thread_id = t.thread_id
  WHERE r.status IN ('active','pending') AND r.expires_at > now()
  ORDER BY COALESCE(ms.last_message_at, r.created_at) DESC NULLS LAST;
$$;

REVOKE ALL ON FUNCTION public.get_rally_inbox(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_rally_inbox(uuid) TO authenticated;

-- 4) RPC: mark thread seen (jump-to-first-unread)

CREATE OR REPLACE FUNCTION public.rally_mark_thread_seen(_thread uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rid text;
BEGIN
  SELECT rally_id INTO rid
  FROM public.rally_threads
  WHERE id = _thread;

  IF rid IS NULL THEN
    RAISE EXCEPTION 'Thread not found';
  END IF;

  IF NOT public.is_rally_member(rid, auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  INSERT INTO public.rally_last_seen (profile_id, rally_id, last_seen)
  VALUES (auth.uid(), rid, now())
  ON CONFLICT (profile_id, rally_id)
  DO UPDATE SET last_seen = EXCLUDED.last_seen;
END;
$$;