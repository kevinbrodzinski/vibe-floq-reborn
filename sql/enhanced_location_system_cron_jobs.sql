-- Enhanced Location System - Automated Maintenance Cron Jobs
-- Run this in your Supabase SQL editor to set up automated maintenance

-- =============================================
-- ENABLE CRON EXTENSION
-- =============================================

-- Enable the pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- =============================================
-- CRON JOB 1: REFRESH PROXIMITY STATISTICS
-- =============================================

-- Refresh materialized views every hour at minute 0
-- This keeps analytics data fresh for dashboards
SELECT cron.schedule(
    'refresh-proximity-stats',           -- Job name
    '0 * * * *',                        -- Every hour at minute 0 (e.g., 1:00, 2:00, 3:00...)
    'SELECT refresh_proximity_stats();'  -- Command to run
);

-- =============================================
-- CRON JOB 2: CLEANUP OLD PROXIMITY EVENTS
-- =============================================

-- Clean up proximity events older than 30 days
-- Runs daily at 2:00 AM to avoid peak usage times
SELECT cron.schedule(
    'cleanup-old-proximity-events',                        -- Job name
    '0 2 * * *',                                          -- Daily at 2:00 AM
    'SELECT cleanup_old_proximity_events(30);'            -- Keep 30 days of data
);

-- =============================================
-- CRON JOB 3: VENUE SIGNATURE MAINTENANCE
-- =============================================

-- Clean up old venue signatures that haven't been verified in 90 days
-- Runs weekly on Sunday at 3:00 AM
SELECT cron.schedule(
    'cleanup-old-venue-signatures',
    '0 3 * * 0',  -- Weekly on Sunday at 3:00 AM
    $$
    DELETE FROM venue_signatures 
    WHERE last_verified < NOW() - INTERVAL '90 days'
      AND confidence_score < 0.3;
    $$
);

-- =============================================
-- CRON JOB 4: GEOFENCE MAINTENANCE
-- =============================================

-- Archive inactive geofences older than 1 year
-- Runs monthly on the 1st at 4:00 AM
SELECT cron.schedule(
    'archive-old-geofences',
    '0 4 1 * *',  -- Monthly on 1st day at 4:00 AM
    $$
    UPDATE geofences 
    SET is_active = false 
    WHERE is_active = true 
      AND updated_at < NOW() - INTERVAL '1 year'
      AND profile_id NOT IN (
        SELECT DISTINCT profile_id_a FROM proximity_events 
        WHERE event_ts >= NOW() - INTERVAL '30 days'
      );
    $$
);

-- =============================================
-- CRON JOB 5: PERFORMANCE MONITORING
-- =============================================

-- Log system performance metrics daily at 1:00 AM
-- This helps track system health over time
SELECT cron.schedule(
    'log-proximity-performance',
    '0 1 * * *',  -- Daily at 1:00 AM
    $$
    INSERT INTO proximity_system_logs (
        log_date,
        total_events_24h,
        unique_users_24h,
        avg_confidence,
        venue_signatures_count,
        active_geofences_count
    )
    SELECT 
        CURRENT_DATE,
        (SELECT records_last_24h FROM proximity_performance_stats),
        (SELECT unique_profiles_a + unique_profiles_b FROM proximity_performance_stats),
        (SELECT avg_confidence FROM proximity_performance_stats),
        (SELECT total_records FROM venue_signature_performance_stats),
        (SELECT COUNT(*) FROM geofences WHERE is_active = true);
    $$
);

-- Create the performance log table for the monitoring job
CREATE TABLE IF NOT EXISTS proximity_system_logs (
    id BIGSERIAL PRIMARY KEY,
    log_date DATE NOT NULL,
    total_events_24h INTEGER,
    unique_users_24h INTEGER,
    avg_confidence NUMERIC(3,2),
    venue_signatures_count INTEGER,
    active_geofences_count INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance log queries
CREATE INDEX IF NOT EXISTS idx_proximity_system_logs_date 
ON proximity_system_logs (log_date DESC);

-- =============================================
-- VIEW ALL SCHEDULED JOBS
-- =============================================

-- Query to see all your cron jobs
-- Run this to verify the jobs were created successfully
SELECT 
    jobid,
    schedule,
    command,
    nodename,
    nodeport,
    database,
    username,
    active,
    jobname
FROM cron.job 
WHERE jobname LIKE '%proximity%' 
   OR jobname LIKE '%venue%' 
   OR jobname LIKE '%geofence%'
ORDER BY jobname;

-- =============================================
-- MANUAL TESTING COMMANDS
-- =============================================

-- Test the maintenance functions manually (optional)
-- Uncomment and run these to test before the cron jobs run

-- Test proximity stats refresh
-- SELECT refresh_proximity_stats();

-- Test cleanup (this will actually delete old data!)
-- SELECT cleanup_old_proximity_events(30);

-- Check current system stats
-- SELECT * FROM proximity_performance_stats;
-- SELECT * FROM venue_signature_performance_stats;

-- =============================================
-- CRON JOB MANAGEMENT
-- =============================================

-- To disable a job (if needed):
-- SELECT cron.unschedule('job-name-here');

-- To modify a job, unschedule it first, then create a new one:
-- SELECT cron.unschedule('refresh-proximity-stats');
-- SELECT cron.schedule('refresh-proximity-stats', '0 */2 * * *', 'SELECT refresh_proximity_stats();');

-- =============================================
-- PERMISSIONS AND SECURITY
-- =============================================

-- Ensure service role can execute cron jobs
GRANT USAGE ON SCHEMA cron TO service_role;
GRANT SELECT ON cron.job TO service_role;

-- Grant permissions for the performance log table
GRANT SELECT, INSERT ON proximity_system_logs TO service_role;
GRANT USAGE ON SEQUENCE proximity_system_logs_id_seq TO service_role;

-- =============================================
-- SUCCESS MESSAGE
-- =============================================

-- If you see this message, all cron jobs were set up successfully!
DO $$
BEGIN
    RAISE NOTICE '✅ Enhanced Location System Cron Jobs Setup Complete!';
    RAISE NOTICE '📊 Proximity stats will refresh every hour';
    RAISE NOTICE '🧹 Old events will be cleaned up daily at 2 AM';
    RAISE NOTICE '🏢 Venue signatures will be maintained weekly';
    RAISE NOTICE '🛡️ Geofences will be archived monthly';
    RAISE NOTICE '📈 Performance metrics will be logged daily';
    RAISE NOTICE '';
    RAISE NOTICE '🔍 Run this query to check your jobs:';
    RAISE NOTICE 'SELECT jobname, schedule, active FROM cron.job WHERE jobname LIKE ''%proximity%'' OR jobname LIKE ''%venue%'';';
END $$;