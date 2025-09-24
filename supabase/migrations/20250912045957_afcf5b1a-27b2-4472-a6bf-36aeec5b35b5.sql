-- Rally inbox Phase 4 integration - comprehensive update
-- Track 1: Rally story thread polish with conflict-guarded messages

-- 1) Ensure messages table has created_at default
ALTER TABLE public.rally_messages
  ALTER COLUMN created_at SET DEFAULT now();

-- 2) UNIQUE index to prevent minute-level duplicates for similar events
CREATE UNIQUE INDEX IF NOT EXISTS ux_rally_messages_minute
  ON public.rally_messages (thread_id, kind, COALESCE(profile_id,'00000000-0000-0000-0000-000000000000'::uuid),
                            date_trunc('minute', created_at));

-- 3) Enhanced last_seen table with proper references
DROP TABLE IF EXISTS public.rally_last_seen CASCADE;
CREATE TABLE public.rally_last_seen (
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rally_id   uuid NOT NULL REFERENCES public.rallies(id) ON DELETE CASCADE,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, rally_id)
);
CREATE INDEX IF NOT EXISTS ix_rally_last_seen_rally ON public.rally_last_seen (rally_id);

-- 4) Ultra-fast inbox materialized view
DROP MATERIALIZED VIEW IF EXISTS public.mv_rally_inbox CASCADE;

CREATE MATERIALIZED VIEW public.mv_rally_inbox AS
WITH rally_threads_with_data AS (
  SELECT 
    rt.id as thread_id, 
    rt.rally_id, 
    rt.title, 
    rt.participants, 
    rt.centroid,
    r.creator_id,
    r.expires_at,
    r.status,
    r.created_at,
    ST_X(r.center) as center_lng,
    ST_Y(r.center) as center_lat,
    r.venue_id,
    r.note
  FROM rally_threads rt
  JOIN rallies r ON r.id = rt.rally_id
  WHERE r.status = 'active' AND r.expires_at > now()
),
last_messages AS (
  SELECT 
    rm.thread_id,
    MAX(rm.created_at) as last_message_at,
    (SELECT body FROM rally_messages WHERE thread_id = rm.thread_id ORDER BY created_at DESC LIMIT 1) as last_message_excerpt
  FROM rally_messages rm
  GROUP BY rm.thread_id
),
invite_data AS (
  SELECT 
    ri.rally_id,
    ri.to_profile,
    ri.status as invite_status,
    ri.responded_at
  FROM rally_invites ri
),
unread_counts AS (
  SELECT 
    rt.thread_id,
    ri.to_profile as profile_id,
    COUNT(rm.*) FILTER (WHERE rm.created_at > COALESCE(rls.last_seen_at, 'epoch')) as unread_count,
    MIN(rm.created_at) FILTER (WHERE rm.created_at > COALESCE(rls.last_seen_at, 'epoch')) as first_unread_at
  FROM rally_threads_with_data rt
  JOIN invite_data ri ON ri.rally_id = rt.rally_id
  LEFT JOIN rally_last_seen rls ON rls.rally_id = rt.rally_id AND rls.profile_id = ri.to_profile
  LEFT JOIN rally_messages rm ON rm.thread_id = rt.thread_id
  GROUP BY rt.thread_id, ri.to_profile
)
SELECT 
  rtd.thread_id,
  rtd.rally_id::text as rally_id,
  rtd.created_at,
  rtd.expires_at,
  rtd.center_lng,
  rtd.center_lat,
  rtd.venue_id,
  rtd.note,
  rtd.creator_id,
  NULL::text as creator_name,
  NULL::text as creator_avatar,
  COALESCE(id.invite_status, 'pending') as invite_status,
  id.responded_at,
  (SELECT COUNT(*) FROM rally_invites WHERE rally_id = rtd.rally_id AND status = 'joined') as joined_count,
  COALESCE(uc.unread_count, 0) as unread_count,
  uc.first_unread_at,
  lm.last_message_at,
  lm.last_message_excerpt,
  uc.profile_id
FROM rally_threads_with_data rtd
LEFT JOIN invite_data id ON id.rally_id = rtd.rally_id
LEFT JOIN last_messages lm ON lm.thread_id = rtd.thread_id
LEFT JOIN unread_counts uc ON uc.thread_id = rtd.thread_id AND uc.profile_id = id.to_profile
WHERE id.to_profile IS NOT NULL OR rtd.creator_id IS NOT NULL;

-- Unique index required for concurrent refresh
CREATE UNIQUE INDEX ux_mv_rally_inbox_pk ON public.mv_rally_inbox (thread_id, COALESCE(profile_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- Enhanced get_rally_inbox function with MV fast path
CREATE OR REPLACE FUNCTION public.get_rally_inbox(_uid uuid DEFAULT auth.uid())
RETURNS TABLE (
  rally_id         text,
  created_at       timestamptz,
  expires_at       timestamptz,
  center_lng       numeric,
  center_lat       numeric,
  venue_id         uuid,
  note             text,
  creator_id       uuid,
  creator_name     text,
  creator_avatar   text,
  invite_status    text,
  responded_at     timestamptz,
  joined_count     integer,
  unread_count     integer,
  first_unread_at  timestamptz,
  last_message_at  timestamptz,
  last_message_excerpt text
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Try materialized view first (ultra-fast path)
  BEGIN
    RETURN QUERY 
    SELECT 
      mri.rally_id,
      mri.created_at,
      mri.expires_at,
      mri.center_lng,
      mri.center_lat,
      mri.venue_id,
      mri.note,
      mri.creator_id,
      mri.creator_name,
      mri.creator_avatar,
      mri.invite_status,
      mri.responded_at,
      mri.joined_count::integer,
      mri.unread_count::integer,
      mri.first_unread_at,
      mri.last_message_at,
      mri.last_message_excerpt
    FROM mv_rally_inbox mri
    WHERE mri.profile_id = _uid OR mri.creator_id = _uid
    ORDER BY COALESCE(mri.last_message_at, mri.created_at) DESC;
    RETURN;
  EXCEPTION 
    WHEN OTHERS THEN
      -- Fallback to base table query
      RETURN QUERY 
      SELECT 
        r.id::text as rally_id,
        r.created_at,
        r.expires_at,
        ST_X(r.center) as center_lng,
        ST_Y(r.center) as center_lat,
        r.venue_id,
        r.note,
        r.creator_id,
        NULL::text as creator_name,
        NULL::text as creator_avatar,
        COALESCE(ri.status, 'pending') as invite_status,
        ri.responded_at,
        (SELECT COUNT(*) FROM rally_invites WHERE rally_id = r.id AND status = 'joined')::integer as joined_count,
        0::integer as unread_count,
        NULL::timestamptz as first_unread_at,
        NULL::timestamptz as last_message_at,
        NULL as last_message_excerpt
      FROM rallies r
      LEFT JOIN rally_invites ri ON ri.rally_id = r.id AND ri.to_profile = _uid
      WHERE (r.creator_id = _uid OR ri.to_profile = _uid)
        AND r.status IN ('active', 'pending')
        AND r.expires_at > now()
      ORDER BY r.created_at DESC;
      RETURN;
  END;
END;
$$;

-- Update rally_mark_thread_seen to use new table structure
CREATE OR REPLACE FUNCTION public.rally_mark_thread_seen(_thread uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rid uuid;
  _me uuid := auth.uid();
BEGIN
  IF _me IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT rally_id INTO rid
  FROM rally_threads
  WHERE id = _thread;

  IF rid IS NULL THEN
    RAISE EXCEPTION 'thread not found';
  END IF;

  -- Check membership
  IF NOT EXISTS (
    SELECT 1 FROM rallies WHERE id = rid AND creator_id = _me
    UNION
    SELECT 1 FROM rally_invites WHERE rally_id = rid AND to_profile = _me
  ) THEN
    RAISE EXCEPTION 'access denied';
  END IF;

  INSERT INTO rally_last_seen(profile_id, rally_id, last_seen_at)
  VALUES (_me, rid, now())
  ON CONFLICT (profile_id, rally_id)
  DO UPDATE SET last_seen_at = EXCLUDED.last_seen_at;
END;
$$;