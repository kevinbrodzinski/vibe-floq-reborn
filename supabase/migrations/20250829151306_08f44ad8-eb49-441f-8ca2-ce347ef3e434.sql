-- CRITICAL SECURITY FIX: Enable RLS on all location tables and partitions
-- This addresses the vulnerability where user location history could be accessed by unauthorized users

BEGIN;

-- 1. Enable RLS on the staging table (currently unprotected)
ALTER TABLE IF EXISTS public.raw_locations_staging ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for staging table
DROP POLICY IF EXISTS "users_own_staging_location_data" ON public.raw_locations_staging;
CREATE POLICY "users_own_staging_location_data"
  ON public.raw_locations_staging
  FOR ALL
  USING (user_id = auth.uid()) 
  WITH CHECK (user_id = auth.uid());

-- 2. Ensure RLS is enabled on the main partitioned table (redundant but safe)
ALTER TABLE IF EXISTS public.raw_locations ENABLE ROW LEVEL SECURITY;

-- 3. Enable RLS on ALL existing partition tables
-- This covers the specific tables mentioned in the security report
DO $$
DECLARE
    partition_name text;
BEGIN
    -- Get all existing raw_locations partitions and enable RLS
    FOR partition_name IN 
        SELECT schemaname||'.'||tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename LIKE 'raw_locations_%'
        AND tablename != 'raw_locations_staging'
    LOOP
        -- Enable RLS on each partition
        EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', partition_name);
        
        -- Create RLS policy for each partition (inherits from parent but explicit is safer)
        EXECUTE format('DROP POLICY IF EXISTS "users_own_partition_data" ON %s', partition_name);
        EXECUTE format(
            'CREATE POLICY "users_own_partition_data" ON %s FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())', 
            partition_name
        );
    END LOOP;
END $$;

-- 4. Update the partition creation function to automatically enable RLS
CREATE OR REPLACE FUNCTION public.ensure_location_partition(_yyyymm text)
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE
  top text := format('raw_locations_%s', _yyyymm);
BEGIN
  -- Create the partition if it doesn't exist
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS public.%I
       PARTITION OF public.raw_locations
       FOR VALUES IN (%L)
       PARTITION BY LIST (geohash5)', top, _yyyymm);

  -- CRITICAL: Enable RLS on the newly created partition
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', top);
  
  -- Create RLS policy for the new partition
  EXECUTE format('DROP POLICY IF EXISTS "users_own_partition_data" ON public.%I', top);
  EXECUTE format(
    'CREATE POLICY "users_own_partition_data" ON public.%I FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())', 
    top
  );
END$$;

-- 5. Create a trigger to automatically secure new partitions
CREATE OR REPLACE FUNCTION public.secure_new_partition()
RETURNS event_trigger 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    obj record;
BEGIN
    FOR obj IN SELECT * FROM pg_event_trigger_ddl_commands() WHERE command_tag = 'CREATE TABLE'
    LOOP
        -- If this is a raw_locations partition, secure it immediately
        IF obj.object_identity LIKE 'public.raw_locations_%' AND obj.object_identity != 'public.raw_locations_staging' THEN
            EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', obj.object_identity);
            EXECUTE format('DROP POLICY IF EXISTS "users_own_partition_data" ON %s', obj.object_identity);
            EXECUTE format(
                'CREATE POLICY "users_own_partition_data" ON %s FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())', 
                obj.object_identity
            );
        END IF;
    END LOOP;
END$$;

-- Create the event trigger (only if it doesn't exist)
DROP EVENT TRIGGER IF EXISTS secure_location_partitions;
CREATE EVENT TRIGGER secure_location_partitions
    ON ddl_command_end
    WHEN TAG IN ('CREATE TABLE')
    EXECUTE FUNCTION public.secure_new_partition();

-- 6. Verify all location-related tables have proper RLS
-- This includes any other location tables that might exist
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT schemaname||'.'||tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND (tablename LIKE '%location%' OR tablename LIKE '%venue_visits%')
        AND tablename NOT IN ('field_tiles', 'field_tiles_v2', 'live_positions') -- These have different access patterns
    LOOP
        EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', tbl);
    END LOOP;
END $$;

COMMIT;

-- Log the security fix
INSERT INTO public.edge_invocation_logs (function_name, status, metadata)
VALUES ('security_fix_location_rls', 'completed', jsonb_build_object(
    'fix_type', 'critical_security_vulnerability',
    'tables_secured', 'all_location_partitions',
    'timestamp', now()
));