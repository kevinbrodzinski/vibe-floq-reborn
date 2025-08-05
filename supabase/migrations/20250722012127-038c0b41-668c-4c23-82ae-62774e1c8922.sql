/* ────────────────────────────────
   0.  Safety first
   ────────────────────────────────*/
BEGIN;

-- If anything fails we roll back
SET LOCAL client_min_messages TO warning;

/* ────────────────────────────────
   1.  completed_steps  →  int[]
   ────────────────────────────────*/
-- a. change type in-place so we keep data
ALTER TABLE public.user_onboarding_progress
  ALTER COLUMN completed_steps  TYPE int[]
  USING (
    COALESCE(
      -- turn ['0','1','2'] jsonb into {0,1,2} int[]
      (SELECT array_agg(value::int)
         FROM jsonb_array_elements_text(completed_steps)
      ),
      ARRAY[]::int[]
    )
  );

-- b. guarantee default
ALTER TABLE public.user_onboarding_progress
  ALTER COLUMN completed_steps SET DEFAULT ARRAY[]::int[];

/* ────────────────────────────────
   2.  unique, case-insensitive usernames
   ────────────────────────────────*/
-- you can't create a UNIQUE CONSTRAINT on an expression,
-- so use a unique index instead:
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
-- make sure the trigger function exists
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