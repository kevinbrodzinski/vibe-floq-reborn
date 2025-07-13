BEGIN;

-- 1️⃣ Give the column a default
ALTER TABLE public.floqs
  ALTER COLUMN activity_score SET DEFAULT 1;

-- 2️⃣ Back-fill existing rows (only those that need it)
UPDATE public.floqs
SET    activity_score = 1
WHERE  COALESCE(activity_score, 0) = 0;

-- 3️⃣ Add constraints for data integrity
ALTER TABLE public.floqs
  ALTER COLUMN activity_score SET NOT NULL;

ALTER TABLE public.floqs
  ADD CONSTRAINT floqs_activity_score_non_negative
  CHECK (activity_score >= 0);

COMMIT;