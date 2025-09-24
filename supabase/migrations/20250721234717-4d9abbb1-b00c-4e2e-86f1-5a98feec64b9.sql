-- ---------------------------------------------------------------
-- Aggregated metadata helper for Plan Cards
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_plan_metadata(p_plan_id uuid)
RETURNS TABLE (
  total_stops                integer,
  confirmed_stops            integer,
  participant_count          integer,
  total_duration_minutes     integer,
  estimated_cost_per_person  numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  /* 1. Stops & duration --------------------------------------------------- */
  SELECT  COUNT(*)                                         AS tot,
          COUNT(*) FILTER (WHERE status = 'confirmed')     AS ready,
          COALESCE(SUM(duration_minutes),0)                AS dur,
          COALESCE(SUM(estimated_cost_per_person),0)       AS cost
    INTO   total_stops, confirmed_stops,
          total_duration_minutes, estimated_cost_per_person
  FROM   plan_stops
  WHERE  plan_id = p_plan_id;

  /* 2. Participants ------------------------------------------------------- */
  SELECT COUNT(*) INTO participant_count
  FROM   plan_participants
  WHERE  plan_id = p_plan_id;

  RETURN NEXT;
END;
$$;

/* 3. Perms – any plan participant or floq participant can call it */
GRANT EXECUTE ON FUNCTION public.get_plan_metadata(uuid) TO authenticated;