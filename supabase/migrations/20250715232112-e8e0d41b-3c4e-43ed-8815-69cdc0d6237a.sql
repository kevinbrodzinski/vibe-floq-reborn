-- Simplified username_available function without explicit casting

DROP FUNCTION IF EXISTS public.username_available(text);

CREATE OR REPLACE FUNCTION public.username_available(check_username text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE lower(username) = lower(check_username)
  );
$$;

GRANT EXECUTE ON FUNCTION public.username_available(text) TO anon, authenticated;