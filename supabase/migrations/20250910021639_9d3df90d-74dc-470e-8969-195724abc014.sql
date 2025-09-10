-- Create notifications table for persistent pings
CREATE TABLE IF NOT EXISTS notifications (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_profile    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  from_profile  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind          text NOT NULL CHECK (kind IN ('ping')),
  payload       jsonb NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  read_at       timestamptz
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS notif_to_profile_created_idx ON notifications(to_profile, created_at DESC);
CREATE INDEX IF NOT EXISTS notif_unread_idx ON notifications(to_profile) WHERE read_at IS NULL;

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies - read/update for recipient only
CREATE POLICY notif_read ON notifications
FOR SELECT USING (to_profile = auth.uid());

CREATE POLICY notif_update ON notifications
FOR UPDATE USING (to_profile = auth.uid()) WITH CHECK (to_profile = auth.uid());

-- No direct insert from clients; SECURITY DEFINER function handles it
REVOKE INSERT ON notifications FROM anon, authenticated;

-- SECURITY DEFINER function to insert notifications
CREATE OR REPLACE FUNCTION ping_friends_insert(
  _recipients uuid[],
  _point      jsonb,
  _message    text,
  _ttl_sec    int
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r uuid; n int := 0;
BEGIN
  IF array_length(_recipients, 1) IS NULL THEN
    RETURN 0;
  END IF;

  -- Guard: only logged-in callers
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  FOREACH r IN ARRAY _recipients LOOP
    INSERT INTO notifications(to_profile, from_profile, kind, payload)
    VALUES (
      r, auth.uid(), 'ping',
      jsonb_build_object(
        'point',   COALESCE(_point, '{}'::jsonb),
        'message', NULLIF(_message, ''),
        'ttlSec',  GREATEST(60, LEAST(3600, COALESCE(_ttl_sec, 600)))
      )
    );
    n := n + 1;
  END LOOP;

  RETURN n;
END;
$$;

-- Enable realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;