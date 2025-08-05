/* nightly refresh of live_count + vibe_score (02:05 UTC) */
-- ensure the helper exists (was created earlier)
select 1;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'refresh_venue_metrics_nightly') then
    perform cron.unschedule(jobid) from cron.job where jobname='refresh_venue_metrics_nightly';
  end if;

  perform cron.schedule(
    'refresh_venue_metrics_nightly',
    '5 2 * * *',
    $$select public.refresh_venue_metrics();$$
  );
end$$;