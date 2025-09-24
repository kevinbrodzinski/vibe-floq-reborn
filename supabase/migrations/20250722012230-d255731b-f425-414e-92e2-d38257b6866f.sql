/* ────────────────────────────────
   Fixed migration - step by step approach
   ────────────────────────────────*/
BEGIN;

-- If anything fails we roll back
SET LOCAL client_min_messages TO warning;

/* ────────────────────────────────
   1.  completed_steps  →  int[] (fixed approach)
   ────────────────────────────────*/
-- a. Add a temporary column
ALTER TABLE public.user_onboarding_progress 
  ADD COLUMN completed_steps_temp int[] DEFAULT ARRAY[]::int[];

-- b. Migrate data using UPDATE (subqueries allowed here)
UPDATE public.user_onboarding_progress 
SET completed_steps_temp = COALESCE(
  (SELECT array_agg(value::int)
   FROM jsonb_array_elements_text(completed_steps)
  ),
  ARRAY[]::int[]
);

-- c. Drop old column and rename new one
ALTER TABLE public.user_onboarding_progress 
  DROP COLUMN completed_steps,
  RENAME COLUMN completed_steps_temp TO completed_steps;

-- d. Set NOT NULL constraint
ALTER TABLE public.user_onboarding_progress 
  ALTER COLUMN completed_steps SET NOT NULL,
  ALTER COLUMN completed_steps SET DEFAULT ARRAY[]::int[];

/* ────────────────────────────────
   2.  unique, case-insensitive usernames
   ────────────────────────────────*/
DROP INDEX IF EXISTS profiles_username_lower_idx;
CREATE UNIQUE INDEX profiles_username_lower_idx
           ON public.profiles (lower(username));

/* ────────────────────────────────
   3.  step-range check
   ────────────────────────────────*/
ALTER TABLE public.user_onboarding_progress
  DROP CONSTRAINT IF EXISTS chk_step_range,
  ADD  CONSTRAINT chk_step_range
       CHECK (current_step BETWEEN 0 AND 10);

/* ────────────────────────────────
   4.  updated_at trigger on INSERT *and* UPDATE
   ────────────────────────────────*/
CREATE OR REPLACE FUNCTION public.set_onboarding_updated_at()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_onboarding_set_updated_at
  ON public.user_onboarding_progress;

CREATE TRIGGER trg_onboarding_set_updated_at
  BEFORE INSERT OR UPDATE
  ON public.user_onboarding_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.set_onboarding_updated_at();

/* ────────────────────────────────
   5.  GIN index for contains queries
   ────────────────────────────────*/
DROP INDEX IF EXISTS idx_onboarding_completed_steps_gin;
CREATE INDEX idx_onboarding_completed_steps_gin
  ON public.user_onboarding_progress
  USING gin (completed_steps);

COMMIT;