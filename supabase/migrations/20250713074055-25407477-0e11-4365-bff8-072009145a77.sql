-- Fix permissions for the new enum overload function
GRANT EXECUTE ON FUNCTION public.calculate_floq_activity_score(uuid, flock_event_type_enum, integer, numeric) TO service_role;