-- ───────────────────────────────────────────────────────────────
-- venue_stays_notify()  (UPDATE)
-- ───────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.venue_stays_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- INSERT  →  arrival
  IF TG_OP = 'INSERT' THEN
    PERFORM pg_notify(
      'venue_stays_frontend',
      row_to_json(NEW)::text
    );
    RETURN NEW;
  END IF;

  -- UPDATE  →  first departure only
  IF TG_OP = 'UPDATE'
     AND OLD.departed_at IS NULL
     AND NEW.departed_at IS NOT NULL
  THEN
    PERFORM pg_notify(
      'venue_stays_frontend',
      row_to_json(NEW)::text
    );
  END IF;

  RETURN NEW;
END;
$$;

-- (re-create or replace the trigger if it already existed)
DROP TRIGGER IF EXISTS trg_venue_stays_notify ON public.venue_stays;
CREATE TRIGGER trg_venue_stays_notify
AFTER INSERT OR UPDATE ON public.venue_stays
FOR EACH ROW EXECUTE FUNCTION public.venue_stays_notify();

-- ───────────────────────────────────────────────────────────────
-- auto_checkin_plan_stop()  (UPDATE)
-- ───────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.auto_checkin_plan_stop()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  ps record;
BEGIN
  -- link stay → stop (already inserted by previous logic)
  INSERT INTO public.plan_check_ins(plan_id, stop_id, user_id, checked_in_at)
  SELECT
    NEW.plan_id,
    NEW.stop_id,
    NEW.user_id,
    NEW.arrived_at
  ON CONFLICT DO NOTHING;

  -- fetch stop meta for the push
  SELECT title
  INTO   ps
  FROM   public.plan_stops
  WHERE  id = NEW.stop_id;

  -- realtime push
  PERFORM pg_notify(
           'plan_checkin_ready',
           json_build_object(
             'plan_id', NEW.plan_id,
             'stop_id', NEW.stop_id,
             'title',   ps.title
           )::text
         );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_checkin_plan_stop ON public.venue_stays;
CREATE TRIGGER trg_auto_checkin_plan_stop
AFTER INSERT ON public.venue_stays
FOR EACH ROW
WHEN (NEW.stop_id IS NOT NULL)     -- safeguard
EXECUTE FUNCTION public.auto_checkin_plan_stop();

-- ───────────────────────────────────────────────────────────────
-- v_friend_last_seen
-- ───────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_friend_last_seen
WITH (security_barrier = true) AS
SELECT
  rl.user_id,
  CASE
    WHEN public.is_live_now(rl.user_id)
    THEN MAX(rl.captured_at)
  END AS last_seen_at
FROM public.raw_locations rl
WHERE rl.captured_at >= now() - INTERVAL '2 hours'
GROUP BY rl.user_id;

-- allow everyone to query their friends (already restricted by the join in app code)
ALTER VIEW public.v_friend_last_seen ENABLE ROW LEVEL SECURITY;
CREATE POLICY self ON public.v_friend_last_seen
  FOR SELECT USING (true);