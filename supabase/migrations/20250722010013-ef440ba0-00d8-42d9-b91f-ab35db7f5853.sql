-- 0️⃣ (Optional) ENUM for version
CREATE TYPE onboarding_version_enum AS ENUM ('v1','v2');

-- 1️⃣ Main table
CREATE TABLE public.user_onboarding_progress (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  onboarding_version onboarding_version_enum NOT NULL DEFAULT 'v2',
  current_step      int  NOT NULL DEFAULT 0,
  completed_steps   jsonb NOT NULL DEFAULT '[]'::jsonb,
  selected_vibe     text,
  profile_data      jsonb,
  avatar_url        text,
  started_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  completed_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, onboarding_version)
);

-- 2️⃣ Quick lookups
CREATE INDEX idx_onboarding_progress_user_version
  ON public.user_onboarding_progress(user_id, onboarding_version);
CREATE INDEX idx_onboarding_completed_steps_gin
  ON public.user_onboarding_progress USING GIN (completed_steps jsonb_path_ops);

-- 3️⃣ Time-stamp trigger
CREATE OR REPLACE FUNCTION public.set_onboarding_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

CREATE TRIGGER trg_onboarding_set_updated_at
  BEFORE INSERT OR UPDATE ON public.user_onboarding_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_onboarding_updated_at();

-- 4️⃣ RLS
ALTER TABLE public.user_onboarding_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read own onboarding progress"
  ON public.user_onboarding_progress
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "write own onboarding progress"
  ON public.user_onboarding_progress
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "update own onboarding progress"
  ON public.user_onboarding_progress
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 5️⃣ Step range guard
ALTER TABLE public.user_onboarding_progress
  ADD CONSTRAINT chk_step_range CHECK (current_step BETWEEN 0 AND 10);

-- 6️⃣ Profile username constraints
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_username_required CHECK (username IS NOT NULL AND username <> '');

CREATE UNIQUE INDEX profiles_username_unique ON public.profiles (lower(username));

-- 7️⃣ Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_onboarding_progress;