-- Fix for plan comments and check-ins SQL migration
BEGIN;

-- 1. Fix mentioned_users default to properly cast to uuid[]
ALTER TABLE public.plan_comments 
ALTER COLUMN mentioned_users SET DEFAULT '{}'::uuid[];

-- 2. Fix the trigger function to use correct profiles table reference
CREATE OR REPLACE FUNCTION public.tg_plan_comment_before()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();

  -- @handle extraction → profiles.username
  -- Fixed: use profiles.id instead of profiles.user_id
  NEW.mentioned_users :=
    (
      SELECT COALESCE(array_agg(p.id), '{}'::uuid[])
      FROM regexp_matches(NEW.content, '@([A-Za-z0-9_]{3,30})', 'g') AS m(handle TEXT)
      JOIN public.profiles p ON p.username = m.handle
    );

  RETURN NEW;
END;
$$;

-- 3. Fix plan_check_ins.location to use proper geography with SRID constraint
ALTER TABLE public.plan_check_ins 
ALTER COLUMN location TYPE geography(Point,4326);

-- 4. Add conditional index for active check-ins by user and stop
CREATE INDEX IF NOT EXISTS idx_plan_checkins_user_stop_active
  ON public.plan_check_ins (user_id, stop_id)
  WHERE checked_out_at IS NULL;

-- 5. Extend check-in notification trigger to notify all participants (not just creator)
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

COMMIT;