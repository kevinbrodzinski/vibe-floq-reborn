-- Ensure username_available function exists and works correctly

-- Drop any existing versions to avoid conflicts
DROP FUNCTION IF EXISTS public.username_available(text);
DROP FUNCTION IF EXISTS public.username_available(u text);

-- Create the username_available function with correct signature
CREATE OR REPLACE FUNCTION public.username_available(username text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE lower(p.username::text) = lower(username)
  );
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.username_available(text) TO anon, authenticated;

-- Ensure profiles table has public read access for username checking
DROP POLICY IF EXISTS "profiles_public_read" ON public.profiles;

CREATE POLICY "profiles_public_read" ON public.profiles
  FOR SELECT
  USING (true);