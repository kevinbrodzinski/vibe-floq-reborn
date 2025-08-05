/* -------------------------------------------------------------------
   Migration: 20250727__profiles_onboarding_fix.sql
   Purpose :  Complete onboarding-related columns, constraints, trigger
              (FK to auth.users was applied earlier)
-------------------------------------------------------------------- */

BEGIN;

/* =========================================================
   A. Add missing columns (safe if they already exist)
   ========================================================= */
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS vibe_preference TEXT,
  ADD COLUMN IF NOT EXISTS profile_created BOOLEAN DEFAULT false;

/* =========================================================
   B. Enforce username integrity
   ========================================================= */
-- Ensure username NOT NULL (no error if already NOT NULL)
ALTER TABLE public.profiles
  ALTER COLUMN username SET NOT NULL;

-- Case-insensitive unique username
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_unique
  ON public.profiles (lower(username));

/* =========================================================
   C. created_at default (harmless if default is already set)
   ========================================================= */
ALTER TABLE public.profiles
  ALTER COLUMN created_at SET DEFAULT now();

/* =========================================================
   D. Avatar required once profile is complete  (PG14-safe guard)
   ========================================================= */
DO $$
BEGIN
  IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
       WHERE conname = 'profiles_avatar_required'
         AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_avatar_required
      CHECK (NOT profile_created OR avatar_url IS NOT NULL);
  END IF;
END$$;

/* =========================================================
   E. Trigger: flag onboarding progress after profile insert
   ========================================================= */
CREATE OR REPLACE FUNCTION public.mark_onboarding_profile_created()
RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER AS $$
BEGIN
  UPDATE public.user_onboarding_progress
     SET profile_created = true,
         updated_at      = now()
   WHERE user_id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mark_onboarding_profile_created
  ON public.profiles;

CREATE TRIGGER trg_mark_onboarding_profile_created
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.mark_onboarding_profile_created();

/* =========================================================
   F. Optional clean-up: fix malformed interests JSON
   ========================================================= */
UPDATE public.profiles
   SET interests = '[]'::jsonb
 WHERE interests::text LIKE '%{]}%';

/* --------------------------------------------------------- */
COMMIT;