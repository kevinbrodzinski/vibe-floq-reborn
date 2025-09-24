-- =======================================
-- 1.  direct_messages.profile_id  + index
-- =======================================
ALTER TABLE public.direct_messages
  ADD COLUMN IF NOT EXISTS profile_id uuid;

UPDATE public.direct_messages
   SET profile_id = sender_id
 WHERE profile_id IS NULL;

ALTER TABLE public.direct_messages
  ALTER COLUMN profile_id SET NOT NULL,
  ADD CONSTRAINT fk_dm_profile
      FOREIGN KEY (profile_id) REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_direct_messages_profile_id
          ON public.direct_messages(profile_id);

-- =======================================
-- 2.  notification helpers
-- =======================================
CREATE OR REPLACE FUNCTION public.fn_emit_notification (
  p_profile_id uuid,
  p_kind       text,
  p_payload    jsonb
) RETURNS void
  LANGUAGE sql SECURITY DEFINER
AS $$
  INSERT INTO public.event_notifications (profile_id, kind, payload)
       VALUES (p_profile_id, p_kind, p_payload);
$$;

-- =======================================
-- 3.  DM notification trigger
-- =======================================
CREATE OR REPLACE FUNCTION public.notify_dm ()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  recipient uuid;
BEGIN
  SELECT CASE
           WHEN NEW.sender_id = dt.member_a THEN dt.member_b
           ELSE dt.member_a
         END
    INTO recipient
    FROM public.direct_threads dt
   WHERE dt.id = NEW.thread_id;

  IF recipient IS NOT NULL THEN
    PERFORM fn_emit_notification(
      recipient,
      'dm',
      jsonb_build_object(
        'thread_id', NEW.thread_id,
        'message_id', NEW.id,
        'sender_id', NEW.sender_id,
        'preview', left(NEW.content, 120)
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dm_notify ON public.direct_messages;
CREATE TRIGGER trg_dm_notify
AFTER INSERT ON public.direct_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_dm();

-- =======================================
-- 4.  Friend-request notification trigger
-- =======================================
CREATE OR REPLACE FUNCTION public.fn_notify_friend_request ()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
      PERFORM fn_emit_notification(
        NEW.other_profile_id,
        'friend_request',
        jsonb_build_object('request_id', NEW.id, 'from', NEW.profile_id)
      );
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'pending'
        AND NEW.status IN ('accepted','declined') THEN
      PERFORM fn_emit_notification(
        NEW.profile_id,
        CONCAT('friend_request_', NEW.status),
        jsonb_build_object('request_id', NEW.id, 'by', NEW.other_profile_id)
      );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_friend_request_notify ON public.friend_requests;
CREATE TRIGGER trg_friend_request_notify
AFTER INSERT OR UPDATE ON public.friend_requests
FOR EACH ROW EXECUTE FUNCTION public.fn_notify_friend_request();