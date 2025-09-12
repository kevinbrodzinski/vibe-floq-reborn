-- Rally message guards and schema improvements (fixed)

-- Ensure profile_id exists for author attributions  
ALTER TABLE rally_messages
  ADD COLUMN IF NOT EXISTS profile_id uuid NULL;

-- Add a minute_bucket column for deduplication
ALTER TABLE rally_messages 
  ADD COLUMN IF NOT EXISTS minute_bucket timestamptz GENERATED ALWAYS AS (date_trunc('minute', created_at)) STORED;

-- ① Prevent duplicate "invite" lines when someone joins repeatedly
CREATE UNIQUE INDEX IF NOT EXISTS ux_rally_msg_invite_guard
ON rally_messages (thread_id, kind, profile_id, minute_bucket)
WHERE kind = 'invite' AND profile_id IS NOT NULL;

-- ② Prevent duplicate "system" lines per minute  
CREATE UNIQUE INDEX IF NOT EXISTS ux_rally_msg_system_guard
ON rally_messages (thread_id, kind, minute_bucket)
WHERE profile_id IS NULL;

-- Fast per-user inbox snapshot materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_rally_inbox AS
SELECT
  i.to_profile                                AS profile_id,
  t.id                                        AS thread_id,
  t.rally_id,
  t.title,
  t.participants,
  t.updated_at                                AS last_message_at,
  ls.last_seen_at                             AS last_seen,
  -- first_unread_at & unread_count derived from last_seen
  (
    SELECT MIN(m.created_at)
    FROM rally_messages m
    WHERE m.thread_id = t.id
      AND m.created_at > COALESCE(ls.last_seen_at, '-infinity'::timestamptz)
  )                                           AS first_unread_at,
  (
    SELECT COUNT(1)
    FROM rally_messages m
    WHERE m.thread_id = t.id
      AND m.created_at > COALESCE(ls.last_seen_at, '-infinity'::timestamptz)
  )                                           AS unread_count
FROM rally_threads t
JOIN rally_invites i     ON i.rally_id = t.rally_id
LEFT JOIN rally_last_seen ls
                       ON ls.profile_id = i.to_profile
                      AND ls.rally_id = t.rally_id;

-- Index for user → newest first
CREATE INDEX IF NOT EXISTS mv_rally_inbox_profile_last
  ON mv_rally_inbox (profile_id, last_message_at DESC);

-- RPC wrapper for MV access with RLS
CREATE OR REPLACE FUNCTION get_rally_inbox_mv()
RETURNS TABLE (
  profile_id uuid, thread_id uuid, rally_id text,
  title text, participants jsonb,
  last_message_at timestamptz, last_seen timestamptz,
  first_unread_at timestamptz, unread_count bigint
) LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    profile_id, thread_id, rally_id,
    title, participants,
    last_message_at, last_seen,
    first_unread_at, unread_count
  FROM mv_rally_inbox
  WHERE profile_id = auth.uid()
  ORDER BY last_message_at DESC
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_rally_inbox_mv() TO authenticated;