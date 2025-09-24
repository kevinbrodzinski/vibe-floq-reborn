BEGIN;

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a wrapper function to call the push notification sender
CREATE OR REPLACE FUNCTION public.send_pending_push()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  -- This would call the edge function via http_post
  -- For now, just log that the cron job ran
  INSERT INTO edge_invocation_logs (function_name, status, metadata)
  VALUES ('send_pending_push', 'success', '{"source": "cron_job", "timestamp": "' || now() || '"}');
END;
$$;

-- Schedule the cron job to run every minute
SELECT cron.schedule(
  'send-push-notifications',
  '*/1 * * * *',                         -- every minute
  $$SELECT public.send_pending_push();$$ 
);

COMMIT;