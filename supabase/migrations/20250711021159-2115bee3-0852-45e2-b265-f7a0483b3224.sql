-- Create cron job for nightly achievement backfill
SELECT cron.schedule(
  'achievement-backfill-nightly',
  '0 2 * * *', -- Run at 2 AM daily
  $$
  SELECT
    net.http_post(
        url:='https://reztyrrafsmlvvlqvsqt.supabase.co/functions/v1/achievement-backfill',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlenR5cnJhZnNtbHZ2bHF2c3F0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjA1MjkxNywiZXhwIjoyMDY3NjI4OTE3fQ.example"}'::jsonb,
        body:='{"source": "cron_job"}'::jsonb
    ) as request_id;
  $$
);

-- Create monitoring function for achievement system health
CREATE OR REPLACE FUNCTION public.get_achievement_system_health()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_users_with_achievements', (
      SELECT COUNT(DISTINCT user_id) FROM user_achievements
    ),
    'total_achievements_earned', (
      SELECT COUNT(*) FROM user_achievements WHERE earned_at IS NOT NULL
    ),
    'achievements_by_type', (
      SELECT jsonb_object_agg(
        ac.code,
        jsonb_build_object(
          'total_earned', COALESCE(earned_count, 0),
          'total_in_progress', COALESCE(progress_count, 0)
        )
      )
      FROM achievement_catalogue ac
      LEFT JOIN (
        SELECT code, COUNT(*) as earned_count
        FROM user_achievements 
        WHERE earned_at IS NOT NULL
        GROUP BY code
      ) earned ON ac.code = earned.code
      LEFT JOIN (
        SELECT code, COUNT(*) as progress_count
        FROM user_achievements 
        WHERE earned_at IS NULL AND progress > 0
        GROUP BY code
      ) progress ON ac.code = progress.code
    ),
    'last_24h_achievements', (
      SELECT COUNT(*) FROM user_achievements 
      WHERE earned_at > now() - interval '24 hours'
    ),
    'system_status', 'healthy'
  ) INTO result;
  
  RETURN result;
END $$;