-- CRITICAL SECURITY FIX: Enable RLS on location partition tables
-- The partition tables were missing RLS protection, allowing unauthorized access to location data

BEGIN;

-- Enable RLS on all existing raw_locations partition tables
ALTER TABLE public.raw_locations_202507 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_locations_202508 ENABLE ROW LEVEL SECURITY; 
ALTER TABLE public.raw_locations_202509 ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for each partition to ensure users can only see their own data
CREATE POLICY "users_own_location_data_202507" 
ON public.raw_locations_202507
FOR ALL
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

CREATE POLICY "users_own_location_data_202508"
ON public.raw_locations_202508  
FOR ALL
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

CREATE POLICY "users_own_location_data_202509"
ON public.raw_locations_202509
FOR ALL  
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

-- Ensure the main partitioned table RLS policy exists
DROP POLICY IF EXISTS "users_own_location_data" ON public.raw_locations;
CREATE POLICY "users_own_location_data"
ON public.raw_locations
FOR ALL
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

-- Ensure staging table RLS policy exists  
DROP POLICY IF EXISTS "users_own_staging_location_data" ON public.raw_locations_staging;
CREATE POLICY "users_own_staging_location_data"
ON public.raw_locations_staging
FOR ALL
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

COMMIT;