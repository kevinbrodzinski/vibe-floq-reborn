CREATE OR REPLACE FUNCTION public.clear_user_vibe()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.user_vibe_states
     SET active      = false
   WHERE user_id = auth.uid()
     AND active;
END;
$$;