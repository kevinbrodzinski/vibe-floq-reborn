/*───────────────────────────────────────────────────────────
  0. Extensions   (safe / idempotent)
───────────────────────────────────────────────────────────*/
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

/*───────────────────────────────────────────────────────────
  1. Test harness schema  (optional, keeps pgTAP objects tidy)
───────────────────────────────────────────────────────────*/
CREATE SCHEMA IF NOT EXISTS test;

/*───────────────────────────────────────────────────────────
  2. weekly_ai_suggestions  (core table)
───────────────────────────────────────────────────────────*/
CREATE TABLE IF NOT EXISTS public.weekly_ai_suggestions (
  user_id     uuid    NOT NULL,
  week_ending date    NOT NULL,           -- always a Sunday (ISO week end)
  json        jsonb   DEFAULT '{}'::jsonb,
  created_at  timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, week_ending)
);

-- Helpful covering index for "latest suggestion per user"
CREATE INDEX IF NOT EXISTS weekly_ai_suggestions_user_week_idx
  ON public.weekly_ai_suggestions (user_id, week_ending DESC);

/*───────────────────────────────────────────────────────────
  3. Row-level security
───────────────────────────────────────────────────────────*/
ALTER TABLE public.weekly_ai_suggestions ENABLE ROW LEVEL SECURITY;

-- Read access
DROP POLICY IF EXISTS weekly_ai_suggestions_select_own ON public.weekly_ai_suggestions;
CREATE POLICY weekly_ai_suggestions_select_own
  ON public.weekly_ai_suggestions
  FOR SELECT
  USING  (user_id = auth.uid());

-- Write access (INSERT / UPDATE / DELETE)
DROP POLICY IF EXISTS weekly_ai_suggestions_write_own ON public.weekly_ai_suggestions;
CREATE POLICY weekly_ai_suggestions_write_own
  ON public.weekly_ai_suggestions
  FOR ALL
  USING      (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());