-- 0. Clean existing data (only needed once)
UPDATE public.plan_participants
SET    rsvp_status = 'pending'
WHERE  rsvp_status IS NULL
   OR  rsvp_status NOT IN ('attending','maybe','not_attending','pending');

-- 1. Create the enum type
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rsvp_status_enum') THEN
    CREATE TYPE rsvp_status_enum AS ENUM ('attending', 'maybe', 'not_attending', 'pending');
  END IF;
END$$;

-- 2. Convert column to use enum
ALTER TABLE public.plan_participants
  ALTER COLUMN rsvp_status DROP DEFAULT,
  ALTER COLUMN rsvp_status TYPE rsvp_status_enum
    USING (rsvp_status::rsvp_status_enum),
  ALTER COLUMN rsvp_status SET DEFAULT 'pending'::rsvp_status_enum;

-- 3. Trigger function (tweaked)
CREATE OR REPLACE FUNCTION public.log_plan_participant_change()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  -- RSVP change
  IF TG_OP = 'UPDATE' AND OLD.rsvp_status IS DISTINCT FROM NEW.rsvp_status THEN
    INSERT INTO public.floq_activity (floq_id, plan_id, user_id, kind, content)
    VALUES (
      (SELECT floq_id FROM public.floq_plans WHERE id = NEW.plan_id),
      NEW.plan_id,
      NEW.user_id,
      'rsvp_changed',
      jsonb_build_object(
        'from_status', OLD.rsvp_status,
        'to_status',   NEW.rsvp_status,
        'user_name',   COALESCE(NEW.guest_name, (
                          SELECT display_name FROM public.profiles WHERE id = NEW.user_id
                        ), 'User')
      )
    );
  END IF;

  -- Guest invited (email OR phone present)
  IF TG_OP = 'INSERT'
     AND (NEW.guest_email IS NOT NULL OR NEW.guest_phone IS NOT NULL) THEN
    INSERT INTO public.floq_activity (floq_id, plan_id, user_id, kind, content)
    VALUES (
      (SELECT floq_id FROM public.floq_plans WHERE id = NEW.plan_id),
      NEW.plan_id,
      NEW.user_id,
      'guest_invited',
      jsonb_build_object(
        'guest_name',  NEW.guest_name,
        'guest_email', NEW.guest_email,
        'guest_phone', NEW.guest_phone
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_plan_participant_change() TO authenticated;

-- 4. Trigger with column filter
DROP TRIGGER IF EXISTS log_plan_participant_change_trigger ON public.plan_participants;

CREATE TRIGGER log_plan_participant_change_trigger
AFTER INSERT OR UPDATE OF rsvp_status, guest_email, guest_phone
ON public.plan_participants
FOR EACH ROW EXECUTE FUNCTION public.log_plan_participant_change();