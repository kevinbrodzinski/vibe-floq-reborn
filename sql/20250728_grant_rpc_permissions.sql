-- Grant execute permissions on the get_active_floqs_with_members function
GRANT EXECUTE ON FUNCTION public.get_active_floqs_with_members(
    p_use_demo boolean, 
    p_limit integer, 
    p_offset integer,
    p_user_lat double precision, 
    p_user_lng double precision
) TO anon, authenticated; 