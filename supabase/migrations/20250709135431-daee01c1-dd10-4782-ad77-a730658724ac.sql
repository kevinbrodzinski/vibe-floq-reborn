-- More robust migration following production best practices
DO $$
BEGIN
  -- Drop existing function variants if they exist
  DROP FUNCTION IF EXISTS public.presence_nearby(NUMERIC, NUMERIC, NUMERIC);
  DROP FUNCTION IF EXISTS public.presence_nearby(NUMERIC, NUMERIC, NUMERIC, BOOLEAN);
  
  -- Create the function with proper visibility filtering
  CREATE OR REPLACE FUNCTION public.presence_nearby(lat NUMERIC, lng NUMERIC, km NUMERIC, include_self BOOLEAN DEFAULT false)
  RETURNS SETOF public.vibes_now AS $func$
    SELECT * FROM public.vibes_now
    WHERE ST_DWithin(geo, ST_MakePoint(lng, lat)::geography, km * 1000)
    AND expires_at > NOW()
    AND (include_self OR user_id != auth.uid())
    AND (
      COALESCE(visibility, 'public') = 'public'
      OR (visibility = 'friends' AND user_id IN (
        -- Placeholder for friends filtering - returns empty until friends table is ready
        SELECT NULL::uuid WHERE FALSE
      ))
      -- 'off' visibility is excluded entirely
    );
  $func$ LANGUAGE SQL STABLE SECURITY DEFINER;
  
  -- Set function owner to high-privilege role for anonymous access
  ALTER FUNCTION public.presence_nearby OWNER TO postgres;
  
  -- Grant explicit execute permissions to anon and authenticated roles
  GRANT EXECUTE ON FUNCTION public.presence_nearby TO anon;
  GRANT EXECUTE ON FUNCTION public.presence_nearby TO authenticated;
  
END $$;