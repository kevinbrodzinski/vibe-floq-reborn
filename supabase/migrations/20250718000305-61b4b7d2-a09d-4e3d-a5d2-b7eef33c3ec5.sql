/* ────────────────────────────────────────────────────────────────────
   0.  Extensions  (safety – no-ops if already present)
──────────────────────────────────────────────────────────────────── */
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgtap;

/* ────────────────────────────────────────────────────────────────────
   1.  weekly_ai_suggestions hardening
──────────────────────────────────────────────────────────────────── */
ALTER TABLE public.weekly_ai_suggestions
    ADD CONSTRAINT IF NOT EXISTS weekly_ai_suggestions_sunday_check
    CHECK (
      -- date_trunc('week', d) → Monday; +6 → Sunday
      week_ending = (date_trunc('week', week_ending)::date + 6)
    );

/* recent-60-day helper index (plain, not concurrently → works inside txn) */
CREATE INDEX IF NOT EXISTS idx_weekly_ai_suggestions_recent_user_weeks
  ON public.weekly_ai_suggestions (user_id, week_ending DESC)
  WHERE week_ending > CURRENT_DATE - 60;

/* RLS: service_role read-only access */
ALTER TABLE public.weekly_ai_suggestions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS service_read_all ON public.weekly_ai_suggestions;
CREATE POLICY service_read_all
  ON public.weekly_ai_suggestions
  FOR SELECT
  USING (true);               -- expose all rows (privileges still matter)

GRANT SELECT ON public.weekly_ai_suggestions TO service_role;

/* ────────────────────────────────────────────────────────────────────
   2.  Regeneration cool-down table
──────────────────────────────────────────────────────────────────── */
CREATE TABLE IF NOT EXISTS public.weekly_ai_suggestion_cooldowns (
  user_id            UUID PRIMARY KEY
                     REFERENCES auth.users (id) ON DELETE CASCADE,
  last_regenerated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.weekly_ai_suggestion_cooldowns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS own_cooldown ON public.weekly_ai_suggestion_cooldowns;
CREATE POLICY own_cooldown
  ON public.weekly_ai_suggestion_cooldowns
  FOR ALL
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

/* quick lookup on freshest regenerate */
CREATE INDEX IF NOT EXISTS idx_cooldown_last_ts
  ON public.weekly_ai_suggestion_cooldowns (last_regenerated_at);

/* ────────────────────────────────────────────────────────────────────
   3.  Streak counters in user_preferences
──────────────────────────────────────────────────────────────────── */
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS energy_streak_weeks  INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS social_streak_weeks  INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS both_streak_weeks    INTEGER DEFAULT 0;