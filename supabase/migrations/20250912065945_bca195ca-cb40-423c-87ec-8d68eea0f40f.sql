-- Rally mark read RPCs (fixed schema alignment)

-- rally_mark_seen(thread): upsert last_seen for the calling user
CREATE OR REPLACE FUNCTION rally_mark_seen(_thread_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER 
SET search_path TO 'public'
AS $$
  INSERT INTO rally_last_seen (profile_id, thread_id, last_seen)
  VALUES (auth.uid(), _thread_id, now())
  ON CONFLICT (profile_id, thread_id)
  DO UPDATE SET last_seen = EXCLUDED.last_seen;
$$;

-- rally_mark_all_seen(): mark every thread in my inbox as read
CREATE OR REPLACE FUNCTION rally_mark_all_seen()
RETURNS void LANGUAGE sql SECURITY DEFINER 
SET search_path TO 'public'
AS $$
  INSERT INTO rally_last_seen (profile_id, thread_id, last_seen)
  SELECT auth.uid(), t.id, now()
  FROM rally_threads t
  JOIN rally_invites i ON i.rally_id = t.rally_id
  WHERE i.to_profile = auth.uid()
  ON CONFLICT (profile_id, thread_id)
  DO UPDATE SET last_seen = EXCLUDED.last_seen;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION rally_mark_seen(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION rally_mark_all_seen() TO authenticated;