-- Fix the username_available function logic

DROP FUNCTION IF EXISTS public.username_available(text);

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

GRANT EXECUTE ON FUNCTION public.username_available(text) TO anon, authenticated;