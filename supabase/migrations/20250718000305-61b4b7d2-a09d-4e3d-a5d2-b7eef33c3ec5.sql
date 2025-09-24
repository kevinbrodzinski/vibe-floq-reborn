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
      week_ending = (date_trunc('week', week_ending::date)::date + 6)
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

/*─────────────────────────────────────────────────────────────────────────────
  Weekly AI Suggestions – pre-warm infrastructure
─────────────────────────────────────────────────────────────────────────────*/

---------------------------- 0. extensions -----------------------------------
CREATE EXTENSION IF NOT EXISTS pg_cron   WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS http      WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto  WITH SCHEMA extensions;

---------------------------- 1. partial index for recent lookups -------------
CREATE INDEX IF NOT EXISTS idx_weekly_ai_suggestions_recent
  ON public.weekly_ai_suggestions (user_id, week_ending DESC)
  WHERE week_ending > CURRENT_DATE - 60;

---------------------------- 2. analytics read policy -----------------------
DROP POLICY IF EXISTS "service role read" ON public.weekly_ai_suggestions;
CREATE POLICY "service role read"
  ON public.weekly_ai_suggestions
  FOR SELECT
  TO service_role
  USING (true);

---------------------------- 3. pre-warm caller function --------------------
CREATE OR REPLACE FUNCTION public.call_weekly_ai_suggestion(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  resp jsonb;
BEGIN
  resp := net.http_post(
    url     := 'https://reztyrrafsmlvvlqvsqt.supabase.co/functions/v1/generate-weekly-ai-suggestion',
    headers := jsonb_build_object(
      'Content-Type',              'application/json',
      'x-supabase-admin-secret',   current_setting('app.admin_secret', true)
    ),
    body    := jsonb_build_object(
      'forceRefresh', false,
      'preWarm',      true,
      'userId',       p_user_id
    )
  );
  
  IF resp ->> 'status' <> '200' THEN
    RAISE WARNING 'pre-warm: % → %', p_user_id, resp;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.call_weekly_ai_suggestion(uuid) TO cron;

---------------------------- 4. cron job -------------------------------------
-- Remove old job if name reused
SELECT cron.unschedule(jobid) 
FROM cron.job
WHERE jobname = 'prewarm-weekly-ai-suggestions';

SELECT cron.schedule(
  job_name => 'prewarm-weekly-ai-suggestions',
  schedule => '59 23 * * 0',              -- Sunday 23:59 UTC
  command  => $cmd$
    WITH active AS (
      SELECT DISTINCT user_id
      FROM   daily_afterglow
      WHERE  date >= CURRENT_DATE - 7      -- "active last week"
      LIMIT  100
    )
    SELECT public.call_weekly_ai_suggestion(user_id) FROM active;
  $cmd$
);

-- Note: Before applying, run manually:
-- ALTER SYSTEM SET app.admin_secret = '<YOUR-SERVICE-ROLE-JWT>';
-- SELECT pg_reload_conf();