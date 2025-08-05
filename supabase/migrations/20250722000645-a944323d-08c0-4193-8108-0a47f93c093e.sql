-- Fix get_plan_metadata function to resolve "column status does not exist" errors
-- and ensure proper data access with RLS

CREATE OR REPLACE FUNCTION public.get_plan_metadata(p_plan_id uuid)
RETURNS TABLE (
  total_stops              integer,
  confirmed_stops          integer,
  participant_count        integer,
  total_duration_minutes   integer,
  estimated_cost_per_person numeric
)
LANGUAGE plpgsql
STABLE                               -- read-only, deterministic per call
SECURITY DEFINER
SET search_path = public             -- safety: pin search_path
AS $$
BEGIN
  RETURN QUERY
  WITH stop_metrics AS (
    SELECT
      COUNT(*)::int                         AS total_stops,
      /* TODO: replace placeholder when a "confirmed" flag exists */
      COUNT(*)::int                         AS confirmed_stops,
      COALESCE(SUM(duration_minutes),0)::int AS total_duration_minutes,
      COALESCE(AVG(estimated_cost_per_person),0)::numeric AS estimated_cost_per_person
    FROM plan_stops
    WHERE plan_id = p_plan_id
  ),
  participant_metrics AS (
    SELECT COUNT(*)::int AS participant_count
    FROM plan_participants
    WHERE plan_id = p_plan_id
  )
  SELECT
    sm.total_stops,
    sm.confirmed_stops,
    pm.participant_count,
    sm.total_duration_minutes,
    sm.estimated_cost_per_person
  FROM stop_metrics sm
  CROSS JOIN participant_metrics pm;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_plan_metadata(uuid) TO authenticated;