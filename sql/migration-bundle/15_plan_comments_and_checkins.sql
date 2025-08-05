BEGIN;

------------------------------------------------------------
-- 1.  plan_comments  (text + reply + mentions)
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.plan_comments (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id         UUID        NOT NULL REFERENCES public.plans(id)      ON DELETE CASCADE,
  user_id         UUID        NOT NULL REFERENCES auth.users(id)        ON DELETE CASCADE,
  content         TEXT        NOT NULL CHECK (char_length(content) <= 2000),
  mentioned_users UUID[]      DEFAULT '{}',              -- filled in trigger
  reply_to_id     UUID        REFERENCES public.plan_comments(id)       ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- read / reply lookup
CREATE INDEX IF NOT EXISTS idx_plan_comments_plan_created
  ON public.plan_comments (plan_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_plan_comments_reply_to
  ON public.plan_comments (reply_to_id);

-- ---------- RLS ----------
ALTER TABLE public.plan_comments ENABLE ROW LEVEL SECURITY;

-- read: author OR anybody in the plan
CREATE POLICY plan_comments_read
  ON public.plan_comments
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
        SELECT 1
        FROM public.plan_participants pp
        WHERE pp.plan_id = plan_comments.plan_id
          AND pp.user_id = auth.uid()
      )
  );

-- write: only self-insert
CREATE POLICY plan_comments_insert
  ON public.plan_comments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- edit: author can edit (no USING for UPDATE → default = same as WITH CHECK)
CREATE POLICY plan_comments_update
  ON public.plan_comments
  FOR UPDATE
  USING      (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

------------------------------------------------------------
-- 1.a triggers: updated_at + mention extraction + notify
------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_plan_comment_before()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();

  -- @handle extraction → profiles.username
  NEW.mentioned_users :=
    (
      SELECT COALESCE(array_agg(p.user_id), '{}')
      FROM regexp_matches(NEW.content, '@([A-Za-z0-9_]{3,30})', 'g') AS m(handle TEXT)
      JOIN public.profiles p ON p.username = m.handle
    );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_plan_comment_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  recipient UUID;
BEGIN
  -- author's own comment is excluded later
  FOR recipient IN
      SELECT DISTINCT u
      FROM unnest(COALESCE(NEW.mentioned_users, '{}')) AS u
      UNION
      SELECT creator_id
      FROM public.plans
      WHERE id = NEW.plan_id
  LOOP
    IF recipient = NEW.user_id THEN CONTINUE; END IF;

    INSERT INTO public.event_notifications (user_id, kind, payload)
    VALUES (
      recipient,
      'plan_comment_new',
      jsonb_build_object(
        'plan_id', NEW.plan_id,
        'comment_id', NEW.id,
        'author_id', NEW.user_id
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_plan_comment_before ON public.plan_comments;
CREATE TRIGGER trg_plan_comment_before
BEFORE INSERT OR UPDATE
ON public.plan_comments
FOR EACH ROW
EXECUTE PROCEDURE public.tg_plan_comment_before();

DROP TRIGGER IF EXISTS trg_plan_comment_notify ON public.plan_comments;
CREATE TRIGGER trg_plan_comment_notify
AFTER INSERT
ON public.plan_comments
FOR EACH ROW
EXECUTE PROCEDURE public.tg_plan_comment_notify();

------------------------------------------------------------
-- 2.  plan_check_ins  (one row per enter / exit)
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.plan_check_ins (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id         UUID          NOT NULL REFERENCES public.plans(id)      ON DELETE CASCADE,
  stop_id         UUID          NOT NULL REFERENCES public.plan_stops(id) ON DELETE CASCADE,
  user_id         UUID          NOT NULL REFERENCES auth.users(id)        ON DELETE CASCADE,
  checked_in_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
  checked_out_at  TIMESTAMPTZ,
  location        GEOGRAPHY,                         -- point (WGS-84)
  device_id       TEXT,
  geo_hash        TEXT,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plan_checkins_plan_stop
  ON public.plan_check_ins (plan_id, stop_id, user_id);

CREATE INDEX IF NOT EXISTS idx_plan_checkins_active
  ON public.plan_check_ins (user_id)
  WHERE checked_out_at IS NULL;

-- ---------- RLS ----------
ALTER TABLE public.plan_check_ins ENABLE ROW LEVEL SECURITY;

-- members of the plan can read
CREATE POLICY plan_checkins_read
  ON public.plan_check_ins
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
        SELECT 1
        FROM public.plan_participants pp
        WHERE pp.plan_id = plan_check_ins.plan_id
          AND pp.user_id = auth.uid()
      )
  );

-- only members can insert
CREATE POLICY plan_checkins_insert
  ON public.plan_check_ins
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.plan_participants pp
      WHERE pp.plan_id = plan_check_ins.plan_id
        AND pp.user_id = auth.uid()
    )
  );

------------------------------------------------------------
-- 2.a auto-close previous active check-in for same user/stop
------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_plan_checkin_close_prev()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.plan_check_ins
  SET    checked_out_at = now()
  WHERE  user_id = NEW.user_id
    AND  stop_id = NEW.stop_id
    AND  checked_out_at IS NULL
    AND  id <> NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_plan_checkin_close_prev ON public.plan_check_ins;
CREATE TRIGGER trg_plan_checkin_close_prev
BEFORE INSERT
ON public.plan_check_ins
FOR EACH ROW
EXECUTE PROCEDURE public.tg_plan_checkin_close_prev();

------------------------------------------------------------
-- 2.b notification on new check-in
------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_plan_checkin_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.event_notifications (user_id, kind, payload)
  SELECT pp.user_id,
         'plan_checkin',
         jsonb_build_object(
           'plan_id', NEW.plan_id,
           'user_id', NEW.user_id,
           'stop_id', NEW.stop_id
         )
  FROM public.plan_participants pp
  WHERE pp.plan_id = NEW.plan_id
    AND pp.user_id <> NEW.user_id;      -- don't notify self
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_plan_checkin_notify ON public.plan_check_ins;
CREATE TRIGGER trg_plan_checkin_notify
AFTER INSERT
ON public.plan_check_ins
FOR EACH ROW
EXECUTE PROCEDURE public.tg_plan_checkin_notify();

COMMIT;