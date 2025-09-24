-- Rally inbox migration-safe bundle - simplified to avoid type conflicts
-- 1) Safety tables (idempotent)

CREATE TABLE IF NOT EXISTS public.rally_last_seen (
  profile_id uuid NOT NULL,
  rally_id   text NOT NULL,  -- TEXT to match rally_threads.rally_id
  last_seen  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, rally_id)
);

-- 2) Membership helper that works with existing types

CREATE OR REPLACE FUNCTION public.is_rally_member(_rally_text text, _uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.rallies r
    LEFT JOIN public.rally_invites ri ON ri.rally_id = r.id
    WHERE r.id::text = _rally_text
      AND (_uid = r.creator_id OR ri.to_profile = _uid)
  );
$$;

REVOKE ALL ON FUNCTION public.is_rally_member(text, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_rally_member(text, uuid) TO authenticated, anon;

-- 3) Simplified inbox function working with existing schema

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
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    r.id::text as rally_id,
    r.created_at,
    r.expires_at,
    ST_X(r.center) as center_lng,
    ST_Y(r.center) as center_lat,
    r.venue_id,
    r.note,
    r.creator_id,
    p.name as creator_name,
    p.avatar_url as creator_avatar,
    COALESCE(ri.status, 'pending') as invite_status,
    ri.responded_at,
    (SELECT COUNT(*) FROM public.rally_invites WHERE rally_id = r.id AND status = 'joined') as joined_count,
    0 as unread_count,  -- Will be computed by client for now
    NULL::timestamptz as first_unread_at,
    NULL::timestamptz as last_message_at,
    NULL as last_message_excerpt
  FROM public.rallies r
  LEFT JOIN public.rally_invites ri ON ri.rally_id = r.id AND ri.to_profile = _uid
  LEFT JOIN public.profiles p ON p.id = r.creator_id
  WHERE (r.creator_id = _uid OR ri.to_profile = _uid)
    AND r.status IN ('active', 'pending')
    AND r.expires_at > now()
  ORDER BY r.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_rally_inbox(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_rally_inbox(uuid) TO authenticated;

-- 4) Mark thread seen function

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

REVOKE ALL ON FUNCTION public.rally_mark_thread_seen(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.rally_mark_thread_seen(uuid) TO authenticated;