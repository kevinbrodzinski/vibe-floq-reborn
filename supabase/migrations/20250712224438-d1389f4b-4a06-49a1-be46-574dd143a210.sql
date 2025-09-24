-- Grant execute permissions on username functions
GRANT EXECUTE ON FUNCTION public.get_user_by_username(citext) TO authenticated;
GRANT EXECUTE ON FUNCTION public.username_available(citext) TO authenticated;
GRANT EXECUTE ON FUNCTION public.attempt_claim_username(citext) TO authenticated;