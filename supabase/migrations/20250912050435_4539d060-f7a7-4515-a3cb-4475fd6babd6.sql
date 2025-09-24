-- Rally inbox Phase 4 integration - simplified migration
-- Track 1: Rally story thread polish with conflict-guarded messages

-- 1) Basic unique index for message deduplication (simplified)
CREATE UNIQUE INDEX IF NOT EXISTS ux_rally_messages_dedup
  ON public.rally_messages (thread_id, kind, body, date_trunc('minute', created_at));

-- 2) Enhanced last_seen table - rally_id as text to match rally_threads
DROP TABLE IF EXISTS public.rally_last_seen CASCADE;
CREATE TABLE public.rally_last_seen (
  profile_id uuid NOT NULL,
  rally_id   text NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, rally_id)
);

-- 3) Update the rally_mark_thread_seen function to use text rally_id
CREATE OR REPLACE FUNCTION public.rally_mark_thread_seen(_thread uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rid text;
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

  -- Check membership (rally_id in rallies table is uuid, threads table is text)
  IF NOT EXISTS (
    SELECT 1 FROM rallies WHERE id::text = rid AND creator_id = _me
    UNION
    SELECT 1 FROM rally_invites WHERE rally_id::text = rid AND to_profile = _me
  ) THEN
    RAISE EXCEPTION 'access denied';
  END IF;

  INSERT INTO rally_last_seen(profile_id, rally_id, last_seen_at)
  VALUES (_me, rid, now())
  ON CONFLICT (profile_id, rally_id)
  DO UPDATE SET last_seen_at = EXCLUDED.last_seen_at;
END;
$$;

-- Grant permissions
REVOKE ALL ON FUNCTION public.rally_mark_thread_seen(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.rally_mark_thread_seen(uuid) TO authenticated;