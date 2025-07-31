-- Phase-4 follow-up: RLS fixes, service-role grants, cron job
--------------------------------------------------------------

-- 0. Ensure required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
-- (postgis / pgcrypto were created earlier)

-- 1. Drop policies that may already exist
DROP POLICY IF EXISTS live_positions_own         ON public.live_positions;
DROP POLICY IF EXISTS live_positions_read_public ON public.live_positions;
DROP POLICY IF EXISTS location_history_own       ON public.location_history;
DROP POLICY IF EXISTS location_metrics_own       ON public.location_metrics;

-- 2. Re-create policies (service_role included)
CREATE POLICY location_history_own
  ON public.location_history
  USING (profile_id = auth.uid() OR current_setting('role') = 'service_role')
  WITH CHECK (profile_id = auth.uid() OR current_setting('role') = 'service_role');

CREATE POLICY live_positions_own
  ON public.live_positions
  USING (profile_id = auth.uid() OR current_setting('role') = 'service_role')
  WITH CHECK (profile_id = auth.uid() OR current_setting('role') = 'service_role');

CREATE POLICY live_positions_read_public
  ON public.live_positions
  FOR SELECT
  USING (visibility = 'public' AND expires_at > now());

CREATE POLICY location_metrics_own
  ON public.location_metrics
  USING (profile_id = auth.uid()
         OR profile_id IS NULL
         OR current_setting('role') = 'service_role')
  WITH CHECK (profile_id = auth.uid()
              OR profile_id IS NULL
              OR current_setting('role') = 'service_role');

-- 3. Extra grants for service_role
GRANT SELECT, INSERT ON public.location_metrics TO service_role;

-- 4. (Re)-schedule the cleanup job every 15 min
DO $$
DECLARE
  _job_id int;
BEGIN
  SELECT jobid
    INTO _job_id
    FROM cron.job
   WHERE jobname = 'cleanup-expired-live-positions';

  IF _job_id IS NOT NULL THEN
    PERFORM cron.unschedule(_job_id);
  END IF;

  PERFORM cron.schedule(
    'cleanup-expired-live-positions',
    '*/15 * * * *',
    $$ SELECT public.cleanup_expired_live_positions(); $$
  );
END $$;