/*─────────────────────────────────────────────────────────────────────────────
  Weekly AI Suggestions – schema hardening, cooldowns, streaks
─────────────────────────────────────────────────────────────────────────────*/

---------------------------- weekly_ai_suggestions hardening ------------------
-- Ensure week_ending is always a Sunday
ALTER TABLE public.weekly_ai_suggestions 
ADD CONSTRAINT weekly_ai_suggestions_sunday_check 
CHECK (week_ending = date_trunc('week', week_ending)::date + 6);

-- Simple index for recent weeks (no date arithmetic in predicate)
CREATE INDEX IF NOT EXISTS idx_weekly_ai_suggestions_recent_user_weeks
  ON public.weekly_ai_suggestions (user_id, week_ending DESC);

-- Enable RLS
ALTER TABLE public.weekly_ai_suggestions ENABLE ROW LEVEL SECURITY;

-- Service role read policy for analytics
DROP POLICY IF EXISTS "service_read_all" ON public.weekly_ai_suggestions;
CREATE POLICY "service_read_all"
  ON public.weekly_ai_suggestions
  FOR SELECT
  TO service_role
  USING (true);

GRANT SELECT ON public.weekly_ai_suggestions TO service_role;


/*─────────────────────────────────────────────────────────────────────────────
  Regeneration cool-down table
─────────────────────────────────────────────────────────────────────────────*/

CREATE TABLE IF NOT EXISTS public.weekly_ai_suggestion_cooldowns (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_regenerated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.weekly_ai_suggestion_cooldowns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_cooldown"
  ON public.weekly_ai_suggestion_cooldowns
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_cooldown_last_ts 
  ON public.weekly_ai_suggestion_cooldowns (last_regenerated_at);


/*─────────────────────────────────────────────────────────────────────────────
  Streak counters in user_preferences
─────────────────────────────────────────────────────────────────────────────*/

ALTER TABLE public.user_preferences 
  ADD COLUMN IF NOT EXISTS energy_streak_weeks  INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS social_streak_weeks  INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS both_streak_weeks    INTEGER DEFAULT 0;