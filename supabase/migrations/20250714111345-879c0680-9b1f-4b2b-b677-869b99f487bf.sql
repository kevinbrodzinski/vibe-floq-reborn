-- Complete notification system implementation
-- Sprint #27: In-app notifications with secure RLS and push notification support

-- 1. Add push_token to profiles for push notifications
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS push_token text;

-- 2. Create user_notifications table
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id         uuid      PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid      NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind       text      NOT NULL,
  title      text      NOT NULL,
  subtitle   text,
  floq_id    uuid      REFERENCES public.floqs(id) ON DELETE CASCADE,
  message_id uuid      REFERENCES public.floq_messages(id) ON DELETE CASCADE,
  plan_id    uuid      REFERENCES public.floq_plans(id) ON DELETE CASCADE,
  read_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  -- Constraint to prevent notification spam
  CONSTRAINT valid_notification_kind CHECK (
    kind IN ('floq_mention', 'plan_rsvp', 'friend_request', 'floq_invitation', 'achievement_earned')
  )
);

-- 3. Enable RLS
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies with proper service-role access
CREATE POLICY "notify_select_self"
  ON public.user_notifications
  FOR SELECT
  USING ( auth.uid() = user_id );

CREATE POLICY "notify_update_self"
  ON public.user_notifications
  FOR UPDATE
  USING ( auth.uid() = user_id )
  WITH CHECK ( auth.uid() = user_id );

CREATE POLICY "notify_insert_service"
  ON public.user_notifications
  FOR INSERT
  WITH CHECK (
    current_setting('request.jwt.claim.role', true) = 'service_role'
  );

CREATE POLICY "notify_delete_self"
  ON public.user_notifications
  FOR DELETE
  USING ( auth.uid() = user_id );

-- 5. Performance indexes
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_created 
  ON public.user_notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_notifications_unread 
  ON public.user_notifications(user_id) 
  WHERE read_at IS NULL;

-- Composite index for efficient unread count queries by type
CREATE INDEX IF NOT EXISTS idx_user_notifications_unread_by_kind
  ON public.user_notifications(user_id, kind)
  WHERE read_at IS NULL;

-- 6. Minimal privilege grants
GRANT SELECT, UPDATE, DELETE ON public.user_notifications TO authenticated;
GRANT INSERT ON public.user_notifications TO service_role;

-- 7. Function to mark notifications as read
CREATE OR REPLACE FUNCTION public.mark_notifications_read(
  notification_ids uuid[] DEFAULT NULL,
  mark_all_for_user boolean DEFAULT false
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count integer;
BEGIN
  IF mark_all_for_user THEN
    -- Mark all unread notifications for the user as read
    UPDATE public.user_notifications
    SET read_at = now()
    WHERE user_id = auth.uid() 
      AND read_at IS NULL;
  ELSIF notification_ids IS NOT NULL THEN
    -- Mark specific notifications as read
    UPDATE public.user_notifications
    SET read_at = now()
    WHERE id = ANY(notification_ids)
      AND user_id = auth.uid()
      AND read_at IS NULL;
  END IF;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.mark_notifications_read(uuid[], boolean) TO authenticated;