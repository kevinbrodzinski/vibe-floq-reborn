-- Notifications table RLS hardening
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- SELECT for the recipient only
CREATE POLICY notif_read_self ON public.notifications
  FOR SELECT USING (to_profile = auth.uid());

-- UPDATE: permit only setting read_at by the recipient
CREATE POLICY notif_update_read_self ON public.notifications
  FOR UPDATE USING (to_profile = auth.uid())
  WITH CHECK (
    to_profile = auth.uid()
    AND (read_at IS NOT DISTINCT FROM read_at)  -- guard invariants
  );

-- Tighten writes: block INSERT from client (server-side only)
REVOKE INSERT ON public.notifications FROM anon, authenticated;

-- Optimized indexes for notification queries
CREATE INDEX IF NOT EXISTS notif_to_profile_unread_created_idx
  ON public.notifications (to_profile, read_at, created_at DESC);

CREATE INDEX IF NOT EXISTS notif_to_profile_created_idx
  ON public.notifications (to_profile, created_at DESC);

-- Device tokens: ensure unique (profile_id, token) pairs
CREATE UNIQUE INDEX IF NOT EXISTS device_tokens_profile_token_uidx
  ON public.device_tokens (profile_id, token);