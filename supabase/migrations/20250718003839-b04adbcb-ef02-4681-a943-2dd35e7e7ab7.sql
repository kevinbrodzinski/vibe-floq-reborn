-- Enable required extensions for pre-warming infrastructure
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

/*----------------------------------------------------------------------------
  Helper the pg_cron job calls once per user to (re-)build the weekly cache
----------------------------------------------------------------------------*/
create or replace function public.call_weekly_ai_suggestion(p_user_id uuid)
returns void
language plpgsql
security definer                                  -- run as owner, not caller
set search_path = public, extensions
as $$
declare
  svc_key   text := current_setting('app.service_role_key', true);
  fn_url    text := current_setting('app.fn_weekly_ai_url',  true);
  resp      jsonb;
begin
  if svc_key is null or fn_url is null then
    raise log 'call_weekly_ai_suggestion: missing secrets (service key / url)';
    return;
  end if;

  resp := net.http_post(
    url     => fn_url,
    headers => jsonb_build_object(
                 'Content-Type', 'application/json',
                 'Authorization', 'Bearer ' || svc_key
               ),
    body    => jsonb_build_object(
                 'preWarm',  true,
                 'userId',   p_user_id        -- edge fn skips auth in pre-warm mode
               )
  );

  if (resp ->> 'status')::int >= 300 then
    raise log 'pre-warm for % failed -> %', p_user_id, resp;
  else
    raise log 'pre-warm ok for %', p_user_id;
  end if;
end;
$$;

-- pg_cron will execute as its own role; grant execute explicitly
grant execute on function public.call_weekly_ai_suggestion(uuid) to cron;

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