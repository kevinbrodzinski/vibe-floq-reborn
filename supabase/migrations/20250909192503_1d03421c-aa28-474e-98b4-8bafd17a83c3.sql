-- Add missing RPC for venue flow counts
BEGIN;

-- Counts recent flow segments per venue since a timestamp.
-- Returns: venue_id, count
CREATE OR REPLACE FUNCTION public.get_venue_flow_counts(since_timestamp timestamptz)
RETURNS TABLE (venue_id uuid, count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT fs.venue_id, COUNT(*)::bigint AS count
  FROM public.flow_segments fs
  WHERE fs.venue_id IS NOT NULL
    AND fs.arrived_at >= since_timestamp
  GROUP BY fs.venue_id
$$;

COMMIT;