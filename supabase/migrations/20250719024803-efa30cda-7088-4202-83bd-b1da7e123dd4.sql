
-- Remove the duplicate 2 AM cron job
SELECT cron.unschedule('generate_daily_afterglow');

-- Verify the existing 4:05 AM job is still there and working
-- (This is just a query to check, no changes made)
SELECT jobname, schedule, command 
FROM cron.job 
WHERE jobname = 'nightly_afterglow_generation';
