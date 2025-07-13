-- Complete serverless brain setup with security & maintainability tweaks

-- 1. Create edge_invocation_logs table
CREATE TABLE IF NOT EXISTS public.edge_invocation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('success', 'error', 'timeout')),
  duration_ms integer,
  error_message text,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add index for frequent date queries
CREATE INDEX IF NOT EXISTS idx_edge_invocation_logs_created_at 
ON public.edge_invocation_logs (created_at);

-- Enable RLS with hardened policy
ALTER TABLE public.edge_invocation_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_role_only_access ON public.edge_invocation_logs;
DROP POLICY IF EXISTS service_role_only ON public.edge_invocation_logs;

CREATE POLICY service_role_only
  ON public.edge_invocation_logs
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Grant explicit privileges
GRANT INSERT, SELECT, UPDATE, DELETE ON public.edge_invocation_logs TO service_role;

-- 2. Create idempotent cron job helper function
CREATE OR REPLACE FUNCTION public.create_or_replace_cron_job(
  job_name text,
  schedule text,
  command text
) 
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Remove existing job if it exists
  PERFORM cron.unschedule(job_name);
  
  -- Create new job
  PERFORM cron.schedule(job_name, schedule, command);
  
  RAISE NOTICE 'Cron job % scheduled successfully', job_name;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to schedule cron job %: %', job_name, SQLERRM;
END;
$$;

-- 3. Set up cron jobs with parameterized JWT
DO $$
DECLARE
  jwt text := current_setting('app.service_role_jwt', true);
  base_url text := 'https://reztyrrafsmlvvlqvsqt.supabase.co/functions/v1';
BEGIN
  IF jwt IS NULL OR jwt = '' THEN
    RAISE WARNING 'Service role JWT not set in app.service_role_jwt - cron jobs skipped. Please set with: ALTER DATABASE postgres SET app.service_role_jwt = ''your_service_role_jwt'';';
    RETURN;
  END IF;

  -- Auto-suggestion engine (every 15 minutes)
  PERFORM public.create_or_replace_cron_job(
    'auto-suggestion-engine-15min',
    '*/15 * * * *',
    format(
      $f$SELECT net.http_post(
             url => %L,
             headers => jsonb_build_object(
               'content-type', 'application/json',
               'authorization', 'Bearer %s'),
             body => '{"trigger":"cron"}'::jsonb,
             timeout_milliseconds => 10000
           );$f$,
      base_url || '/auto-suggestion-engine',
      jwt)
  );

  -- Relationship tracker (every 5 minutes)
  PERFORM public.create_or_replace_cron_job(
    'relationship-tracker-5min',
    '*/5 * * * *',
    format(
      $f$SELECT net.http_post(
             url => %L,
             headers => jsonb_build_object(
               'content-type', 'application/json',
               'authorization', 'Bearer %s'),
             body => '{"trigger":"cron"}'::jsonb,
             timeout_milliseconds => 8000
           );$f$,
      base_url || '/relationship-tracker',
      jwt)
  );

  -- Activity score processor (every 2 minutes)
  PERFORM public.create_or_replace_cron_job(
    'activity-score-processor-2min',
    '*/2 * * * *',
    format(
      $f$SELECT net.http_post(
             url => %L,
             headers => jsonb_build_object(
               'content-type', 'application/json',
               'authorization', 'Bearer %s'),
             body => '{"trigger":"cron"}'::jsonb,
             timeout_milliseconds => 5000
           );$f$,
      base_url || '/activity-score-processor',
      jwt)
  );

  RAISE NOTICE 'All cron jobs configured successfully with parameterized JWT';
END $$;

-- 4. Comment for post-migration setup
COMMENT ON TABLE public.edge_invocation_logs IS 'Observability table for Edge Function execution logs. Service role access only for security.';

-- Instructions for setting JWT (will appear in migration output)
DO $$
BEGIN
  RAISE NOTICE 'IMPORTANT: After this migration, set your service role JWT with:';
  RAISE NOTICE 'ALTER DATABASE postgres SET app.service_role_jwt = ''your_service_role_jwt_here'';';
  RAISE NOTICE 'Then re-run this migration or manually call the cron job setup.';
END $$;