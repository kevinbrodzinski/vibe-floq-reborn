-- 1) Helper function to emit notifications safely
CREATE OR REPLACE FUNCTION public.emit_event_notification(
  p_profile_id uuid,
  p_kind text,
  p_payload jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.event_notifications (profile_id, kind, payload)
  VALUES (p_profile_id, p_kind, p_payload)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- 2) Efficient indexes for querying unseen notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'idx_event_notifications_profile_seen'
      AND n.nspname = 'public'
  ) THEN
    CREATE INDEX idx_event_notifications_profile_seen ON public.event_notifications (profile_id, seen_at);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'idx_event_notifications_profile_created'
      AND n.nspname = 'public'
  ) THEN
    CREATE INDEX idx_event_notifications_profile_created ON public.event_notifications (profile_id, created_at DESC);
  END IF;
END $$;

-- 3) RPC to count unseen notifications (enforces self-access)
CREATE OR REPLACE FUNCTION public.count_unseen_notifications(p_profile_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_cnt integer;
BEGIN
  -- enforce self-access: only allow counting own notifications
  IF p_profile_id IS DISTINCT FROM auth.uid() THEN
    RETURN 0;
  END IF;
  SELECT COUNT(*) INTO v_cnt
  FROM public.event_notifications
  WHERE profile_id = p_profile_id AND seen_at IS NULL;
  RETURN COALESCE(v_cnt, 0);
END;
$$;

-- 4) Notify the DM recipient when a new direct message is inserted
CREATE OR REPLACE FUNCTION public.tg_notify_dm_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  a uuid;
  b uuid;
  recipient uuid;
BEGIN
  SELECT member_a_profile_id, member_b_profile_id
  INTO a, b
  FROM public.direct_threads
  WHERE id = NEW.thread_id;

  IF NEW.profile_id = a THEN
    recipient := b;
  ELSE
    recipient := a;
  END IF;

  IF recipient IS NOT NULL AND recipient <> NEW.profile_id THEN
    PERFORM public.emit_event_notification(
      recipient,
      'dm',
      jsonb_build_object('thread_id', NEW.thread_id, 'message_id', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.direct_messages') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'trg_notify_dm_insert'
    ) THEN
      DROP TRIGGER trg_notify_dm_insert ON public.direct_messages;
    END IF;
    CREATE TRIGGER trg_notify_dm_insert
    AFTER INSERT ON public.direct_messages
    FOR EACH ROW EXECUTE FUNCTION public.tg_notify_dm_insert();
  END IF;
END $$;

-- 5) Notify original DM author when someone reacts to their message
CREATE OR REPLACE FUNCTION public.tg_notify_dm_reaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  author uuid;
  thread uuid;
BEGIN
  SELECT profile_id, thread_id
  INTO author, thread
  FROM public.direct_messages
  WHERE id = NEW.message_id;

  IF author IS NOT NULL AND author <> NEW.profile_id THEN
    PERFORM public.emit_event_notification(
      author,
      'dm_reaction',
      jsonb_build_object('thread_id', thread, 'message_id', NEW.message_id, 'emoji', NEW.emoji)
    );
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.direct_message_reactions') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'trg_notify_dm_reaction'
    ) THEN
      DROP TRIGGER trg_notify_dm_reaction ON public.direct_message_reactions;
    END IF;
    CREATE TRIGGER trg_notify_dm_reaction
    AFTER INSERT ON public.direct_message_reactions
    FOR EACH ROW EXECUTE FUNCTION public.tg_notify_dm_reaction();
  END IF;
END $$;
