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
  Weekly-AI pre-warm infrastructure
─────────────────────────────────────────────────────────────────────────────*/

-- 0. safety: extensions
CREATE EXTENSION IF NOT EXISTS pg_cron  WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS http     WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;            -- misc

-------------------------------------------------------------------------------
-- 1. helper: store the service-role token privately inside Postgres config
--    (run ONCE, **outside** version control; leave commented here for docs)
-- ALTER SYSTEM SET app.admin_secret = '<YOUR-SERVICE-ROLE-JWT>';
-- SELECT pg_reload_conf();

-------------------------------------------------------------------------------
-- 2. SECURE WRAPPER that pg_cron will call
CREATE OR REPLACE FUNCTION public.call_weekly_ai_suggestion(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER                            -- runs with creator's power
SET search_path = public, extensions
AS $$
DECLARE
  resp jsonb;
BEGIN
  resp := net.http_post(
    url     := 'https://<YOUR-PROJECT-REF>.supabase.co/functions/v1/generate-weekly-ai-suggestion',
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

  -- optional: log failures
  IF resp->>'status' <> '200' THEN
    RAISE WARNING 'Pre-warm call for % returned: %', p_user_id, resp;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.call_weekly_ai_suggestion(uuid) TO cron; -- not to PUBLIC

-------------------------------------------------------------------------------
-- 3. pg_cron job (runs Sun 23:59 UTC)
SELECT cron.unschedule(jobid)
FROM   cron.job
WHERE  jobname = 'prewarm-weekly-ai-suggestions';

SELECT cron.schedule(
  job_name => 'prewarm-weekly-ai-suggestions',
  schedule => '59 23 * * 0',  -- Sunday 23:59 UTC
  command  => $cmd$
    WITH active AS (
      SELECT DISTINCT user_id
      FROM   daily_afterglow
      WHERE  date >= CURRENT_DATE - 7
      LIMIT  100                       -- tune per quota
    )
    SELECT public.call_weekly_ai_suggestion(user_id)
    FROM   active;
  $cmd$
);