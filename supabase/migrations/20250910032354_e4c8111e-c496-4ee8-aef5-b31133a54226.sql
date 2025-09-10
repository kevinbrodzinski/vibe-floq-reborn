-- Create optimized index for unread notifications count
CREATE INDEX IF NOT EXISTS notif_to_profile_unread_created_idx
ON public.notifications (to_profile, created_at DESC)
WHERE read_at IS NULL;