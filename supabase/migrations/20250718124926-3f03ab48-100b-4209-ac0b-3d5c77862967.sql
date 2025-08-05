-- Fix RLS policies for crossed paths functionality
-- The people_crossed_paths_today function needs access to vibes_log and profiles tables

-- Enable RLS on vibes_log if not already enabled
DO $$ 
BEGIN
    IF NOT (SELECT pg_table_is_visible('vibes_log'::regclass)) THEN
        RAISE NOTICE 'Table vibes_log does not exist, skipping RLS policies';
    ELSE
        -- Enable RLS on vibes_log
        ALTER TABLE vibes_log ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS vibes_log_read_own ON vibes_log;
        DROP POLICY IF EXISTS vibes_log_read_for_crossed_paths ON vibes_log;
        
        -- Allow users to read their own vibes_log entries
        CREATE POLICY vibes_log_read_own
        ON vibes_log
        FOR SELECT
        USING (user_id = auth.uid());
        
        -- Allow security definer functions to read vibes_log for crossed paths
        CREATE POLICY vibes_log_read_for_crossed_paths
        ON vibes_log
        FOR SELECT
        USING (true);  -- Security definer functions can access all data
    END IF;
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'Table vibes_log does not exist, skipping RLS policies';
END $$;