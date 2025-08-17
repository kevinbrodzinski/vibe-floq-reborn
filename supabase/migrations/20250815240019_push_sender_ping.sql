-- 19A: function uses pg_net; expects a GUC service_role_key
CREATE OR REPLACE FUNCTION public.push_sender_ping() RETURNS void
LANGUAGE plpgsql AS $$
DECLARE srk text;
BEGIN
  srk := current_setting('service_role_key', true);
  IF srk IS NULL OR srk = '' THEN
    RAISE EXCEPTION 'service_role_key GUC is unset or empty (needed for x-api-key header)';
  END IF;

  PERFORM net.http_post(
    url     := 'https://<project>.functions.supabase.co/push-sender',
    headers := jsonb_build_object('x-api-key', srk),
    body    := '{}'::jsonb
  );
END$$;

-- 19B: point cron 44 to the wrapper
SELECT cron.alter_job(
  44,
  command => 'SELECT public.push_sender_ping();'
);

/* Note: set the GUC once, e.g.
   ALTER DATABASE postgres SET service_role_key = '<YOUR_EDGE_FN_KEY>';
*/