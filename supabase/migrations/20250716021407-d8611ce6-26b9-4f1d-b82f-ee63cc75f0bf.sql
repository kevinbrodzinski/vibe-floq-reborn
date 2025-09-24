-- Permissions for Supabase edge functions / clients
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.daily_afterglow
  TO authenticated;

GRANT EXECUTE ON FUNCTION public.generate_daily_afterglow_sql(uuid, date)
  TO authenticated, service_role;