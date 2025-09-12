-- Fix rally_last_seen schema and add mark read RPC functions with correct column names

-- Create improved rally_mark_seen function using correct column names
CREATE OR REPLACE FUNCTION public.rally_mark_seen(_rally_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  -- Upsert last_seen_at to now() for this (profile, rally)
  INSERT INTO public.rally_last_seen (profile_id, rally_id, last_seen_at)
  VALUES (uid, _rally_id, now())
  ON CONFLICT (profile_id, rally_id)
  DO UPDATE SET last_seen_at = EXCLUDED.last_seen_at;

  -- Optional: notify channel for realtime updates
  PERFORM pg_notify('rally_inbox_seen', _rally_id::text);
END;
$$;

-- Create batch mark all rallies seen function using correct column names
CREATE OR REPLACE FUNCTION public.rally_mark_all_seen()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  INSERT INTO public.rally_last_seen (profile_id, rally_id, last_seen_at)
  SELECT auth.uid(), r.id, now()
  FROM public.rallies r
  WHERE r.status = 'active'
  ON CONFLICT (profile_id, rally_id) 
  DO UPDATE SET last_seen_at = EXCLUDED.last_seen_at;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.rally_mark_seen(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rally_mark_all_seen() TO authenticated;