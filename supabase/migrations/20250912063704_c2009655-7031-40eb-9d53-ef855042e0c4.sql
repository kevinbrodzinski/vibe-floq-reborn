-- Fix rally_last_seen schema and add mark read RPC functions

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS rally_last_seen_updated_at ON public.rally_last_seen;

-- Create improved rally_mark_seen function
CREATE OR REPLACE FUNCTION public.rally_mark_seen(_rally_id uuid)
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

  -- Upsert last_seen to now() for this (profile, rally)
  INSERT INTO public.rally_last_seen (profile_id, rally_id, last_seen)
  VALUES (uid, _rally_id, now())
  ON CONFLICT (profile_id, rally_id)
  DO UPDATE SET last_seen = EXCLUDED.last_seen, updated_at = now();

  -- Optional: notify channel for realtime updates
  PERFORM pg_notify('rally_inbox_seen', _rally_id::text);
END;
$$;

-- Create batch mark all rallies seen function
CREATE OR REPLACE FUNCTION public.rally_mark_all_seen()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  INSERT INTO public.rally_last_seen (profile_id, rally_id, last_seen)
  SELECT auth.uid(), r.id, now()
  FROM public.rallies r
  WHERE r.status = 'active'
  ON CONFLICT (profile_id, rally_id) 
  DO UPDATE SET last_seen = EXCLUDED.last_seen, updated_at = now();
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.rally_mark_seen(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rally_mark_all_seen() TO authenticated;