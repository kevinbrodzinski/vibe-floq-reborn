BEGIN;

/* 1. Drop the trigger first (keeps the function around for reference) */
DROP TRIGGER IF EXISTS trg_friend_request_notify
  ON public.friend_requests;

/* 2. Replace function body with correct column names */
CREATE OR REPLACE FUNCTION public.fn_notify_friend_request()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
      PERFORM fn_emit_notification(
        NEW.other_profile_id,  -- Fixed: was NEW.friend_id
        'friend_request',
        jsonb_build_object(
          'request_id', NEW.id,
          'from',       NEW.profile_id
        ));
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'pending'
        AND NEW.status IN ('accepted','declined') THEN
      PERFORM fn_emit_notification(
        NEW.profile_id,
        'friend_request_'||NEW.status,
        jsonb_build_object(
          'request_id', NEW.id,
          'by',         NEW.other_profile_id  -- Fixed: was NEW.friend_id
        ));
  END IF;
  RETURN NEW;
END;
$$;

/* 3. Re-attach the trigger */
CREATE TRIGGER trg_friend_request_notify
AFTER INSERT OR UPDATE ON public.friend_requests
FOR EACH ROW EXECUTE FUNCTION public.fn_notify_friend_request();

COMMIT;