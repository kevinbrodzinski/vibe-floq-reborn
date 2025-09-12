-- Rally inbox system with unread counts and message threading (Fixed version)

-- ===================================================================
-- 1. Rally messages table with proper structure and RLS
-- ===================================================================

-- Create rally_messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.rally_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id    UUID NOT NULL REFERENCES public.rally_threads(id) ON DELETE CASCADE,
  rally_id     TEXT NOT NULL, -- matches rally_threads.rally_id type
  author_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  kind         TEXT NOT NULL CHECK (kind IN ('invite','joined','declined','note','system')),
  body         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on rally_messages
ALTER TABLE public.rally_messages ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_rally_messages_rally ON public.rally_messages(rally_id);
CREATE INDEX IF NOT EXISTS idx_rally_messages_thread ON public.rally_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_rally_messages_created ON public.rally_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_rally_messages_rally_time ON public.rally_messages(rally_id, created_at DESC);

-- ===================================================================
-- 2. Rally last seen table for unread tracking
-- ===================================================================

CREATE TABLE IF NOT EXISTS public.rally_last_seen (
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rally_id   TEXT NOT NULL, -- matches rally_threads.rally_id type  
  last_seen  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, rally_id)
);

-- Enable RLS on rally_last_seen
ALTER TABLE public.rally_last_seen ENABLE ROW LEVEL SECURITY;

-- Indexes for fast joins
CREATE INDEX IF NOT EXISTS idx_rally_last_seen_rally ON public.rally_last_seen(rally_id);
CREATE INDEX IF NOT EXISTS idx_rally_last_seen_profile ON public.rally_last_seen(profile_id);

-- ===================================================================
-- 3. Helper functions
-- ===================================================================

-- Helper function to check rally membership (using text rally_id)
CREATE OR REPLACE FUNCTION public.is_rally_member(_rally TEXT, _uid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.rallies r
    LEFT JOIN public.rally_invites ri
      ON ri.rally_id::text = _rally AND ri.to_profile = _uid
    WHERE r.id::text = _rally
      AND (_uid = r.creator_id OR ri.to_profile = _uid)
  );
$$;

-- Helper function to get rally roles (using text rally_id)
CREATE OR REPLACE FUNCTION public._rally_roles()
RETURNS TABLE (
  rally_id TEXT,
  profile_id UUID,
  role TEXT
) 
LANGUAGE sql STABLE AS $$
  SELECT r.id::text AS rally_id, r.creator_id AS profile_id, 'creator'::TEXT AS role
  FROM public.rallies r
  WHERE r.status = 'active'
  UNION ALL
  SELECT i.rally_id::text, i.to_profile, 'invitee'::TEXT
  FROM public.rally_invites i
  JOIN public.rallies r ON r.id::text = i.rally_id::text
  WHERE r.status = 'active' AND r.expires_at > now()
$$;

-- Trigger to ensure rally_id is populated in rally_messages
CREATE OR REPLACE FUNCTION public.rally_messages_fill_rally_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.rally_id IS NULL THEN
    SELECT rally_id INTO NEW.rally_id
    FROM public.rally_threads
    WHERE id = NEW.thread_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rally_messages_fill_rally_id ON public.rally_messages;
CREATE TRIGGER trg_rally_messages_fill_rally_id
BEFORE INSERT ON public.rally_messages
FOR EACH ROW
EXECUTE FUNCTION public.rally_messages_fill_rally_id();

-- ===================================================================
-- 4. RLS Policies
-- ===================================================================

-- Rally threads policies
ALTER TABLE public.rally_threads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rally_threads_select ON public.rally_threads;
CREATE POLICY rally_threads_select
ON public.rally_threads
FOR SELECT
USING (public.is_rally_member(rally_id));

DROP POLICY IF EXISTS rally_threads_insert ON public.rally_threads;
CREATE POLICY rally_threads_insert
ON public.rally_threads
FOR INSERT
WITH CHECK (public.is_rally_member(rally_id));

DROP POLICY IF EXISTS rally_threads_update ON public.rally_threads;
CREATE POLICY rally_threads_update
ON public.rally_threads
FOR UPDATE
USING (public.is_rally_member(rally_id))
WITH CHECK (public.is_rally_member(rally_id));

-- Rally messages policies
DROP POLICY IF EXISTS rally_messages_select ON public.rally_messages;
CREATE POLICY rally_messages_select
ON public.rally_messages
FOR SELECT
USING (public.is_rally_member(rally_id));

DROP POLICY IF EXISTS rally_messages_insert ON public.rally_messages;
CREATE POLICY rally_messages_insert
ON public.rally_messages
FOR INSERT
WITH CHECK (
  public.is_rally_member(rally_id) AND 
  (author_id = auth.uid() OR author_id IS NULL)
);

-- Rally last seen policies
DROP POLICY IF EXISTS rally_last_seen_self ON public.rally_last_seen;
CREATE POLICY rally_last_seen_self
ON public.rally_last_seen
FOR ALL
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

-- ===================================================================
-- 5. Materialized view for rally inbox with unread counts
-- ===================================================================

DROP MATERIALIZED VIEW IF EXISTS public.mv_rally_inbox CASCADE;

CREATE MATERIALIZED VIEW public.mv_rally_inbox AS
WITH
-- All rallies I'm part of (creator or invited)
_roles AS (
  SELECT * FROM public._rally_roles()
),
-- Only still-active rallies I'm in
_base AS (
  SELECT
    rr.profile_id,
    rr.rally_id,
    r.creator_id,
    r.status,
    r.created_at,
    r.expires_at,
    r.venue_id,
    r.note
  FROM _roles rr
  JOIN public.rallies r ON r.id::text = rr.rally_id
  WHERE r.status = 'active' AND r.expires_at > now()
),
-- Last message info
last_msg AS (
  SELECT 
    m.rally_id,
    MAX(m.created_at) AS last_message_at,
    (ARRAY_AGG(m.kind || COALESCE(' '|| (m.body->>'note'), '') ORDER BY m.created_at DESC))[1] AS last_message_excerpt
  FROM public.rally_messages m
  GROUP BY m.rally_id
),
-- Unread from others + first unread timestamp
unread AS (
  SELECT
    b.profile_id,
    m.rally_id,
    COUNT(*)::INT AS unread_count,
    MIN(m.created_at) AS first_unread_at
  FROM _base b
  JOIN public.rally_messages m ON m.rally_id = b.rally_id
  LEFT JOIN public.rally_last_seen ls
    ON ls.profile_id = b.profile_id AND ls.rally_id = b.rally_id
  WHERE m.created_at > COALESCE(ls.last_seen, 'epoch'::timestamptz)
    AND m.author_id IS DISTINCT FROM b.profile_id -- exclude my own messages
    AND COALESCE(m.kind, 'message') NOT IN ('system','invite') -- optional: suppress meta
  GROUP BY b.profile_id, m.rally_id
),
-- Basic rally stats
stats AS (
  SELECT
    b.profile_id,
    b.rally_id,
    (SELECT COUNT(*) FROM public.rally_invites ri
      WHERE ri.rally_id::text = b.rally_id AND ri.status = 'joined') AS joined_count,
    (SELECT COUNT(*) FROM public.rally_invites ri
      WHERE ri.rally_id::text = b.rally_id AND ri.status = 'pending') AS pending_count
  FROM _base b
)
SELECT
  b.profile_id,
  b.rally_id,
  b.creator_id,
  b.status,
  b.created_at,
  b.expires_at,
  b.venue_id, 
  b.note,
  COALESCE(u.unread_count, 0) AS unread_count,
  u.first_unread_at,
  COALESCE(s.joined_count, 0) AS joined_count,
  COALESCE(s.pending_count, 0) AS pending_count,
  lm.last_message_at,
  lm.last_message_excerpt
FROM _base b
LEFT JOIN unread u ON u.profile_id = b.profile_id AND u.rally_id = b.rally_id
LEFT JOIN stats s ON s.profile_id = b.profile_id AND s.rally_id = b.rally_id
LEFT JOIN last_msg lm ON lm.rally_id = b.rally_id;

-- Indexes for fast access
CREATE UNIQUE INDEX mv_rally_inbox_pk ON public.mv_rally_inbox(profile_id, rally_id);
CREATE INDEX mv_rally_inbox_profile_exp ON public.mv_rally_inbox(profile_id, expires_at);
CREATE INDEX mv_rally_inbox_profile_last ON public.mv_rally_inbox(profile_id, last_message_at DESC);

-- ===================================================================
-- 6. RPC functions
-- ===================================================================

-- Get rally inbox for current user
CREATE OR REPLACE FUNCTION public.get_rally_inbox()
RETURNS SETOF public.mv_rally_inbox
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.mv_rally_inbox
  WHERE profile_id = auth.uid()
  ORDER BY COALESCE(last_message_at, created_at) DESC, expires_at DESC;
$$;

-- Mark rally as seen (using text rally_id)
CREATE OR REPLACE FUNCTION public.mark_rally_seen(p_rally_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile UUID := auth.uid();
  v_allowed BOOLEAN;
BEGIN
  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  -- Only participants (creator or invitee) may mark seen
  SELECT EXISTS (
    SELECT 1
    FROM public.rallies r
    LEFT JOIN public.rally_invites i ON i.rally_id::text = p_rally_id
    WHERE r.id::text = p_rally_id
      AND (r.creator_id = v_profile OR i.to_profile = v_profile)
  ) INTO v_allowed;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'access denied';
  END IF;

  INSERT INTO public.rally_last_seen(profile_id, rally_id, last_seen)
  VALUES (v_profile, p_rally_id, now())
  ON CONFLICT (profile_id, rally_id)
  DO UPDATE SET last_seen = EXCLUDED.last_seen;
END;
$$;

-- Mark thread as seen (resolves rally from thread)
CREATE OR REPLACE FUNCTION public.rally_mark_thread_seen(_thread UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rid TEXT;
BEGIN
  -- Find the rally for this thread
  SELECT rally_id INTO rid
  FROM public.rally_threads
  WHERE id = _thread;

  IF rid IS NULL THEN
    RAISE EXCEPTION 'Thread not found';
  END IF;

  -- Membership enforcement
  IF NOT public.is_rally_member(rid, auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  INSERT INTO public.rally_last_seen (profile_id, rally_id, last_seen)
  VALUES (auth.uid(), rid, now())
  ON CONFLICT (profile_id, rally_id)
  DO UPDATE SET last_seen = EXCLUDED.last_seen;
END;
$$;

-- Refresh materialized view
CREATE OR REPLACE FUNCTION public.refresh_rally_inbox()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_rally_inbox;
END;
$$;

-- Seed invite messages into a thread
CREATE OR REPLACE FUNCTION public.rally_seed_invite_messages(_thread UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rid TEXT;
BEGIN
  SELECT rally_id INTO rid FROM public.rally_threads WHERE id = _thread;
  IF rid IS NULL THEN
    RAISE EXCEPTION 'Thread not found';
  END IF;

  -- Only allow members to seed
  IF NOT public.is_rally_member(rid, auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  INSERT INTO public.rally_messages (thread_id, rally_id, author_id, kind, body, created_at)
  SELECT
    _thread,
    rid,
    NULL, -- system message
    'invite',
    jsonb_build_object('note', 'Invited', 'to_profile', ri.to_profile),
    now()
  FROM public.rally_invites ri
  WHERE ri.rally_id::text = rid
  ON CONFLICT DO NOTHING;
END;
$$;

-- ===================================================================
-- 7. Grant permissions
-- ===================================================================

REVOKE ALL ON FUNCTION public.is_rally_member(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_rally_member(TEXT, UUID) TO authenticated, anon;

REVOKE ALL ON FUNCTION public.get_rally_inbox() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_rally_inbox() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.mark_rally_seen(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_rally_seen(TEXT) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.rally_mark_thread_seen(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rally_mark_thread_seen(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.rally_seed_invite_messages(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rally_seed_invite_messages(UUID) TO authenticated, service_role;

-- Initial refresh of materialized view
REFRESH MATERIALIZED VIEW public.mv_rally_inbox;