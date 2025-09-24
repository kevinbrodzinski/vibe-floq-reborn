-- 📌 Spatial-index DDL (fast cache look-ups)
-- One composite index that lets Postgres use the bounding-box
-- of *either* endpoint to prune quickly.
CREATE INDEX IF NOT EXISTS idx_transit_cache_geom_gist
    ON public.plan_transit_cache
USING GIST (from_geom, to_geom);

-- 🛡️ BEFORE-UPDATE trigger: forbid location → NULL
/* -----------------------------------------------------------------
   Guard: a stop must always keep a non-NULL, valid geometry
   -----------------------------------------------------------------*/
CREATE OR REPLACE FUNCTION public.prevent_null_stop_location()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.location IS NULL THEN
    RAISE EXCEPTION
      'plan_stops.location may not be set to NULL – use a valid geometry';
  END IF;

  -- Optional extra safety: block EMPTY or wrong SRID
  IF ST_IsEmpty(NEW.location)
     OR GeometryType(NEW.location) <> 'POINT'
     OR ST_SRID(NEW.location) <> 4326 THEN
    RAISE EXCEPTION
      'plan_stops.location must be a non-empty POINT with SRID 4326';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_null_stop_location
  ON public.plan_stops;

CREATE TRIGGER trg_prevent_null_stop_location
  BEFORE UPDATE OF location           -- run only when `location` changes
  ON public.plan_stops
  FOR EACH ROW
EXECUTE FUNCTION public.prevent_null_stop_location();

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