-- Schedule the publish_presence_counts function to run every minute using pg_cron
-- This is idempotent and safe for repeated migrations

DO $$
BEGIN
  IF NOT EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'publish_presence_counts'
  ) THEN
    PERFORM cron.schedule(
      job_name => 'publish_presence_counts',
      schedule => '* * * * *',
      command  => $$CALL public.publish_presence_counts();$$
    );
  END IF;
END$$;