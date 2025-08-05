-- Username availability helper that bypasses RLS safely
CREATE OR REPLACE FUNCTION public.username_exists(p_username citext)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER                      -- run with table owner rights
AS $$
DECLARE
  _found boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE username = lower(p_username)
  ) INTO _found;

  RETURN _found;
END;
$$;

-- Make sure only the logged-in app can call it
GRANT EXECUTE ON FUNCTION public.username_exists(citext)
       TO authenticated;