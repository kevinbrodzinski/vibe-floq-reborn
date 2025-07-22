-- Fix column name ambiguity by qualifying column names
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
      -- TODO: replace placeholder when a "confirmed" flag exists
      COUNT(*)::int                         AS confirmed_stops,
      -- Calculate duration from start_time/end_time or use duration_minutes if available
      COALESCE(
        CASE 
          WHEN SUM(ps.duration_minutes) > 0 THEN SUM(ps.duration_minutes)
          ELSE SUM(
            CASE 
              WHEN ps.start_time IS NOT NULL AND ps.end_time IS NOT NULL 
              THEN EXTRACT(EPOCH FROM (ps.end_time - ps.start_time))/60
              ELSE 60 -- default 1 hour per stop
            END
          )
        END,
        0
      )::int AS total_duration_minutes,
      COALESCE(AVG(ps.estimated_cost_per_person),0)::numeric AS avg_estimated_cost_per_person
    FROM plan_stops ps
    WHERE ps.plan_id = p_plan_id
  ),
  participant_metrics AS (
    SELECT COUNT(*)::int AS participant_count
    FROM plan_participants pp
    WHERE pp.plan_id = p_plan_id
  )
  SELECT
    sm.total_stops,
    sm.confirmed_stops,
    pm.participant_count,
    sm.total_duration_minutes,
    sm.avg_estimated_cost_per_person AS estimated_cost_per_person
  FROM stop_metrics sm
  CROSS JOIN participant_metrics pm;
END;
$$;