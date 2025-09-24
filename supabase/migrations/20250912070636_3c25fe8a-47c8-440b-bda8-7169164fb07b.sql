-- Create rally mark functions with existing schema (rally_id approach)

-- Use rally_id instead of thread_id for now to match existing schema
CREATE OR REPLACE FUNCTION rally_mark_seen(_rally_id text)
RETURNS void LANGUAGE sql SECURITY DEFINER 
SET search_path TO 'public'
AS $$
  INSERT INTO rally_last_seen (profile_id, rally_id, last_seen_at)
  VALUES (auth.uid(), _rally_id, now())
  ON CONFLICT (profile_id, rally_id)
  DO UPDATE SET last_seen_at = EXCLUDED.last_seen_at;
$$;

CREATE OR REPLACE FUNCTION rally_mark_all_seen()
RETURNS void LANGUAGE sql SECURITY DEFINER 
SET search_path TO 'public'
AS $$
  INSERT INTO rally_last_seen (profile_id, rally_id, last_seen_at)
  SELECT auth.uid(), t.rally_id, now()
  FROM rally_threads t
  JOIN rally_invites i ON i.rally_id::text = t.rally_id
  WHERE i.to_profile = auth.uid()
  ON CONFLICT (profile_id, rally_id)
  DO UPDATE SET last_seen_at = EXCLUDED.last_seen_at;
$$;