BEGIN;

--──────────────────────────────
-- 0 ▸ Ensure RLS on event_notifications allows inserts
--──────────────────────────────
ALTER TABLE public.event_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS event_notifications_insert ON public.event_notifications;

CREATE POLICY event_notifications_insert
  ON public.event_notifications
  FOR INSERT
  WITH CHECK (profile_id = auth.uid());

--──────────────────────────────
-- 1 ▸ Drop old triggers & functions
--──────────────────────────────
DROP TRIGGER IF EXISTS trg_dm_notify              ON public.direct_messages;
DROP TRIGGER IF EXISTS trg_plan_invite_notify     ON public.plan_invitations;
DROP TRIGGER IF EXISTS trg_floq_invite_notify     ON public.floq_invitations;
DROP TRIGGER IF EXISTS trg_friend_request_notify  ON public.friend_requests;

DROP FUNCTION IF EXISTS public.notify_dm();
DROP FUNCTION IF EXISTS public.notify_plan_invite();
DROP FUNCTION IF EXISTS public.notify_floq_invite();
DROP FUNCTION IF EXISTS public.fn_notify_friend_request();
DROP FUNCTION IF EXISTS public.fn_notify_floq_invite();
DROP FUNCTION IF EXISTS public.fn_notify_plan_invite();

--──────────────────────────────
-- 2 ▸ Notification helper
--──────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_emit_notification(
  p_profile_id uuid,
  p_kind       text,
  p_payload    jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  -- bypass recipient-side RLS
  INSERT INTO public.event_notifications (profile_id, kind, payload)
  VALUES (p_profile_id, p_kind, p_payload);
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_emit_notification(uuid,text,jsonb) TO authenticated;

--──────────────────────────────
-- 3 ▸ Direct-message trigger
--──────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_notify_dm()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  recipient uuid;
BEGIN
  SELECT CASE
           WHEN NEW.profile_id = dt.member_a THEN dt.member_b
           ELSE dt.member_a
         END
    INTO recipient
    FROM public.direct_threads dt
   WHERE dt.id = NEW.thread_id;

  IF recipient IS NOT NULL AND recipient <> NEW.profile_id THEN
    PERFORM fn_emit_notification(
      recipient,
      'dm',
      jsonb_build_object(
        'thread_id',  NEW.thread_id,
        'message_id', NEW.id,
        'sender_id',  NEW.profile_id,
        'preview',    left(COALESCE(NEW.content,''), 120)
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_dm_notify
AFTER INSERT ON public.direct_messages
FOR EACH ROW EXECUTE FUNCTION public.fn_notify_dm();

--──────────────────────────────
-- 4 ▸ Friend-request trigger
--──────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_notify_friend_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    PERFORM fn_emit_notification(
      NEW.other_profile_id,
      'friend_request',
      jsonb_build_object('request_id', NEW.id, 'from', NEW.profile_id)
    );

  ELSIF TG_OP = 'UPDATE'
        AND OLD.status = 'pending'
        AND NEW.status IN ('accepted','declined') THEN
    PERFORM fn_emit_notification(
      NEW.profile_id,
      'friend_request_' || NEW.status,
      jsonb_build_object('request_id', NEW.id, 'by', NEW.other_profile_id)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_friend_request_notify
AFTER INSERT OR UPDATE ON public.friend_requests
FOR EACH ROW EXECUTE FUNCTION public.fn_notify_friend_request();

--──────────────────────────────
-- 5 ▸ Floq-invite trigger
--──────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_notify_floq_invite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    PERFORM fn_emit_notification(
      NEW.invitee_id,
      'floq_invite',
      jsonb_build_object('invite_id', NEW.id, 'floq_id', NEW.floq_id, 'from', NEW.inviter_id)
    );

  ELSIF TG_OP = 'UPDATE'
        AND OLD.status = 'pending'
        AND NEW.status IN ('accepted','declined') THEN
    PERFORM fn_emit_notification(
      NEW.inviter_id,
      'floq_invite_' || NEW.status,
      jsonb_build_object('invite_id', NEW.id, 'by', NEW.invitee_id)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_floq_invite_notify
AFTER INSERT OR UPDATE ON public.floq_invitations
FOR EACH ROW EXECUTE FUNCTION public.fn_notify_floq_invite();

--──────────────────────────────
-- 6 ▸ Plan-invite trigger (dynamic)
--──────────────────────────────
DO $$
BEGIN
  IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name   = 'plan_invitations'
  ) THEN

    EXECUTE '
      CREATE OR REPLACE FUNCTION public.fn_notify_plan_invite()
      RETURNS trigger
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public, pg_catalog
      AS $$ 
      BEGIN
        IF TG_OP = ''INSERT'' AND NEW.status = ''pending'' THEN
          PERFORM fn_emit_notification(
            NEW.invitee_id,
            ''plan_invite'',
            jsonb_build_object(
              ''invite_id'', NEW.id,
              ''plan_id'',   NEW.plan_id,
              ''from'',      NEW.inviter_id
            )
          );
        ELSIF TG_OP = ''UPDATE''
              AND OLD.status = ''pending''
              AND NEW.status IN (''accepted'',''declined'') THEN
          PERFORM fn_emit_notification(
            NEW.inviter_id,
            ''plan_invite_'' || NEW.status,
            jsonb_build_object(
              ''invite_id'', NEW.id,
              ''by'',        NEW.invitee_id
            )
          );
        END IF;
        RETURN NEW;
      END;
      $$';
    
    EXECUTE '
      CREATE TRIGGER trg_plan_invite_notify
      AFTER INSERT OR UPDATE ON public.plan_invitations
      FOR EACH ROW EXECUTE FUNCTION public.fn_notify_plan_invite()';
  END IF;
END $$;

COMMIT;