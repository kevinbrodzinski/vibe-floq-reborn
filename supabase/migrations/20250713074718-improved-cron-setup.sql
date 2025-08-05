-- Improved cron job setup with safety and reliability enhancements
-- Prerequisites: Ensure pg_cron and pg_net extensions are enabled

-- utility wrapper to avoid duplicates
CREATE OR REPLACE FUNCTION public.create_or_replace_cron_job(
  p_job_name text,
  p_schedule text,
  p_sql text
) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  -- explicit search path for safety
  SET search_path = public, pg_catalog;
  
  -- drop if exists (idempotent)
  PERFORM 1 FROM cron.job WHERE jobname = p_job_name;
  IF FOUND THEN
    PERFORM cron.unschedule(p_job_name);
  END IF;

  -- create
  PERFORM cron.schedule(p_job_name, p_schedule, p_sql);
END;
$$ SECURITY DEFINER;

-- grant execute permission to service role only
GRANT EXECUTE ON FUNCTION public.create_or_replace_cron_job TO service_role;

-- optional: create edge function invocation logs table for debugging
CREATE TABLE IF NOT EXISTS public.edge_invocation_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  function_name text NOT NULL,
  invoked_at timestamptz DEFAULT now(),
  response_status integer,
  response_body jsonb,
  error_message text
);

-- ::::: auto-suggestion-engine every 15 min ::::::
DO $$
DECLARE
  jwt text := current_setting('my.service_role_key', true);
BEGIN
  IF jwt IS NULL OR jwt = '' THEN
    RAISE WARNING 'Service role key not found. Set with: ALTER DATABASE postgres SET my.service_role_key = ''your_service_role_jwt'';';
    RETURN;
  END IF;

  PERFORM public.create_or_replace_cron_job(
    'auto-suggestion-engine-15min',
    '*/15 * * * *',
    format($f$
      SELECT net.http_post(
        url      => %L,
        headers  => jsonb_build_object(
                      'content-type', 'application/json',
                      'authorization', 'Bearer %s'
                    ),
        body     => '{"scheduled": true}'::jsonb,
        timeout_milliseconds => 10000
      );
    $f$, 'https://reztyrrafsmlvvlqvsqt.supabase.co/functions/v1/auto-suggestion-engine', jwt)
  );
END $$;

-- ::::: cleanup-worker hourly ::::::::::::::::::::::
DO $$
DECLARE
  jwt text := current_setting('my.service_role_key', true);
BEGIN
  IF jwt IS NULL OR jwt = '' THEN
    RAISE WARNING 'Service role key not found. Set with: ALTER DATABASE postgres SET my.service_role_key = ''your_service_role_jwt'';';
    RETURN;
  END IF;

  PERFORM public.create_or_replace_cron_job(
    'cleanup-worker-hourly',
    '0 * * * *',
    format($f$
      SELECT net.http_post(
        url      => %L,
        headers  => jsonb_build_object(
                      'content-type', 'application/json',
                      'authorization', 'Bearer %s'
                    ),
        body     => '{"scheduled": true}'::jsonb,
        timeout_milliseconds => 15000
      );
    $f$, 'https://reztyrrafsmlvvlqvsqt.supabase.co/functions/v1/cleanup-worker', jwt)
  );
END $$;

-- view scheduled jobs
-- SELECT jobname, schedule, command FROM cron.job;