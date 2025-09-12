-- RPC function for setting rally last seen timestamp
CREATE OR REPLACE FUNCTION public.rally_set_last_seen(_rally_id uuid, _ts timestamptz DEFAULT now())
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  INSERT INTO public.rally_last_seen(profile_id, rally_id, last_seen)
  VALUES (auth.uid(), _rally_id, _ts)
  ON CONFLICT (profile_id, rally_id) 
  DO UPDATE SET last_seen = EXCLUDED.last_seen;
$$;