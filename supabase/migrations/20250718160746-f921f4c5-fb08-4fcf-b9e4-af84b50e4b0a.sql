-- 1. Add NOT-NULL flag to afterglow cache
ALTER TABLE public.daily_afterglow
  ADD COLUMN IF NOT EXISTS is_stale boolean NOT NULL DEFAULT false;

-- 2. Generic lightweight task queue (idempotent)
CREATE TABLE IF NOT EXISTS public.task_queue (
  id            uuid      PRIMARY KEY DEFAULT gen_random_uuid(),
  task          text      NOT NULL,
  payload       jsonb     NOT NULL DEFAULT '{}',
  created_at    timestamptz DEFAULT now(),
  processed_at  timestamptz,
  status        text      NOT NULL DEFAULT 'pending'
);

ALTER TABLE public.task_queue ENABLE ROW LEVEL SECURITY;

-- Service-role-only policy ➊
DROP POLICY IF EXISTS task_queue_service_only ON public.task_queue;
CREATE POLICY task_queue_service_only
  ON public.task_queue
  FOR ALL
  USING  ( pg_has_role(NULL, 'service_role', 'member') )
  WITH CHECK ( pg_has_role(NULL, 'service_role', 'member') );

--------------------------------------------------------------------
-- 3.  NIGHTLY BATCH ENQUEUER
--------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enqueue_afterglow_cron()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.task_queue(task, payload)
  SELECT 'generate_afterglow',
         jsonb_build_object(
           'user_id', id,
           'date',    (current_date - 1)
         )
  FROM auth.users
  WHERE email_confirmed_at IS NOT NULL
  ON CONFLICT DO NOTHING;          -- idempotent
END;
$$;

--------------------------------------------------------------------
-- 4.  REAL-TIME STALE-FLAG + NOTIFY
--------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.flag_afterglow_stale()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  uid uuid := NEW.user_id;
BEGIN
  -- Upsert the flag ➋➌
  INSERT INTO public.daily_afterglow (user_id, date, is_stale)
  VALUES (uid, current_date, TRUE)
  ON CONFLICT (user_id, date)
  DO UPDATE SET is_stale = TRUE;

  -- Broadcast for edge worker / client refresh
  PERFORM pg_notify('afterglow_refresh_req', uid::text);

  RETURN NEW;
END;
$$;

--------------------------------------------------------------------
-- 5.  TRIGGERS ON SOURCE TABLES
--------------------------------------------------------------------
-- vibes_now (assumes column name user_id; change if needed)
DROP TRIGGER IF EXISTS trg_vibes_afterglow ON public.vibes_now;
CREATE TRIGGER trg_vibes_afterglow
  AFTER INSERT OR UPDATE ON public.vibes_now
  FOR EACH ROW EXECUTE FUNCTION public.flag_afterglow_stale();

-- floq_participants
DROP TRIGGER IF EXISTS trg_floq_participants_afterglow ON public.floq_participants;
CREATE TRIGGER trg_floq_participants_afterglow
  AFTER INSERT ON public.floq_participants
  FOR EACH ROW EXECUTE FUNCTION public.flag_afterglow_stale();

-- venue_live_presence
DROP TRIGGER IF EXISTS trg_venue_presence_afterglow ON public.venue_live_presence;
CREATE TRIGGER trg_venue_presence_afterglow
  AFTER INSERT OR UPDATE ON public.venue_live_presence
  FOR EACH ROW EXECUTE FUNCTION public.flag_afterglow_stale();

--------------------------------------------------------------------
-- 6.  PG_CRON – nightly batch at 04:05 UTC
--------------------------------------------------------------------
SELECT cron.schedule(
  'nightly_afterglow_generation',
  '5 4 * * *',
  $$SELECT public.enqueue_afterglow_cron();$$
);