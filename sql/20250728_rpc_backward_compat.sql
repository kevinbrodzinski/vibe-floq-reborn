-- Restore the missing wrapper so existing clients stop 404-ing
CREATE OR REPLACE FUNCTION public.get_active_floqs_with_members(
  p_use_demo   boolean DEFAULT false,
  p_limit      integer DEFAULT 20,
  p_offset     integer DEFAULT 0,
  p_user_lat   double precision DEFAULT NULL,
  p_user_lng   double precision DEFAULT NULL)
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.get_visible_floqs_with_members(
        p_use_demo,
        p_limit,
        p_offset,
        p_user_lat,
        p_user_lng);
END;
$$; 