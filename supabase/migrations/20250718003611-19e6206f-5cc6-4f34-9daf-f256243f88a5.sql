-- Enable required extensions for pre-warming infrastructure
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Unschedule any existing pre-warm job
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'prewarm-weekly-ai-suggestions';

-- Schedule the pre-warm job to run every Sunday at 23:59 UTC
SELECT cron.schedule(
  job_name => 'prewarm-weekly-ai-suggestions',
  schedule => '59 23 * * 0',        -- Sunday 23:59 UTC
  command  => $$                    -- any valid SQL
    WITH active AS (
      SELECT DISTINCT user_id
      FROM daily_afterglow
      WHERE date >= CURRENT_DATE - 7
      LIMIT 100
    )
    SELECT public.call_weekly_ai_suggestion(user_id)
    FROM active;
  $$
);