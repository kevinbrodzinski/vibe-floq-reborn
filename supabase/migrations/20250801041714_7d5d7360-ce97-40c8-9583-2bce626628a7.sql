BEGIN;

/* ---------------------------------------------------------------
   Add creator as participant (backfill + trigger)
---------------------------------------------------------------- */

-- 0️⃣ Clean up any rows with NULL profile_id first
DELETE FROM public.floq_participants WHERE profile_id IS NULL;

-- 1️⃣ Ensure composite PK exists for ON CONFLICT logic
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'floq_participants_pkey' 
    AND conrelid = 'public.floq_participants'::regclass
  ) THEN
    ALTER TABLE public.floq_participants
      ADD CONSTRAINT floq_participants_pkey
      PRIMARY KEY (floq_id, profile_id);
  END IF;
END $$;

-- 2️⃣ Back-fill missing creators
INSERT INTO public.floq_participants (floq_id, profile_id, role, joined_at)
SELECT
  f.id,
  f.creator_id,
  'creator',
  f.created_at
FROM public.floqs f
LEFT JOIN public.floq_participants fp
  ON fp.floq_id = f.id
 AND fp.profile_id = f.creator_id
WHERE fp.profile_id IS NULL
  AND f.creator_id IS NOT NULL;

-- 3️⃣ Trigger fn
CREATE OR REPLACE FUNCTION public.add_creator_as_participant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  IF NEW.creator_id IS NOT NULL THEN
    INSERT INTO public.floq_participants (floq_id, profile_id, role, joined_at)
    VALUES (NEW.id, NEW.creator_id, 'creator', NEW.created_at)
    ON CONFLICT (floq_id, profile_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- 4️⃣ Trigger
DROP TRIGGER IF EXISTS trigger_add_creator_as_participant ON public.floqs;
CREATE TRIGGER trigger_add_creator_as_participant
AFTER INSERT ON public.floqs
FOR EACH ROW
EXECUTE FUNCTION public.add_creator_as_participant();

COMMIT;