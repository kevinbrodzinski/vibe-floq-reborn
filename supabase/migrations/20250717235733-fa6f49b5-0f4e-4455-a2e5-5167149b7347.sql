/*───────────────────────────────────────────────────────────
  0. Extensions   (safe / idempotent)
───────────────────────────────────────────────────────────*/
CREATE EXTENSION IF NOT EXISTS pgcrypto  WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgtap     WITH SCHEMA extensions;

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
CREATE POLICY IF NOT EXISTS weekly_ai_suggestions_select_own
  ON public.weekly_ai_suggestions
  FOR SELECT
  USING  (user_id = auth.uid());

-- Write access (INSERT / UPDATE / DELETE)
CREATE POLICY IF NOT EXISTS weekly_ai_suggestions_write_own
  ON public.weekly_ai_suggestions
  FOR ALL
  USING      (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

/*───────────────────────────────────────────────────────────
  4. pgTAP sanity test (runs only in test schema)
───────────────────────────────────────────────────────────*/
SET search_path = test, public, extensions;

BEGIN;

SELECT plan(2);

-- 4 A. Insert works for authed user
SELECT ok(
  (INSERT INTO public.weekly_ai_suggestions (user_id, week_ending)
   VALUES (extensions.gen_random_uuid(), current_date)
   RETURNING true),
  'insert succeeded'
);

-- 4 B. RLS blocks anonymous
SET LOCAL role = anon;
SELECT throws_ok(
  $$INSERT INTO public.weekly_ai_suggestions VALUES ('00000000-0000-0000-0000-000000000000', current_date)$$,
  'permission denied',
  'anon blocked by RLS'
);

SELECT * FROM finish();

ROLLBACK;  -- keep test data out of prod

RESET search_path;