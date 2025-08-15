-- Drop the old version of add_plan_stop_with_order that uses TIME types
-- This fixes the function overloading conflict
DROP FUNCTION IF EXISTS public.add_plan_stop_with_order(
  UUID, TEXT, TEXT, TIME WITHOUT TIME ZONE, TIME WITHOUT TIME ZONE, INTEGER, UUID, NUMERIC
);

-- Ensure we only have the TEXT version that handles TIMESTAMPTZ conversion
-- This function should already exist from the previous migration
-- but we'll recreate it to be sure it's the only version

CREATE OR REPLACE FUNCTION public.add_plan_stop_with_order(
  p_plan_id UUID,
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_start_time TEXT DEFAULT NULL,
  p_end_time TEXT DEFAULT NULL,
  p_duration_minutes INTEGER DEFAULT 60,
  p_venue_id UUID DEFAULT NULL,
  p_estimated_cost NUMERIC DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_stop_id UUID;
  new_order INTEGER;
  converted_start_time TIMESTAMPTZ;
  converted_end_time TIMESTAMPTZ;
BEGIN
  --------------------------------------------------------------------------
  -- A U T H
  --------------------------------------------------------------------------
  IF NOT EXISTS (
    SELECT 1 FROM plan_participants
    WHERE plan_id = p_plan_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorised to add stops to this plan';
  END IF;

  --------------------------------------------------------------------------
  -- C O N V E R T   T I M E S
  --------------------------------------------------------------------------
  -- Convert time strings to TIMESTAMPTZ (using today's date as base)
  IF p_start_time IS NOT NULL THEN
    converted_start_time := (CURRENT_DATE || ' ' || p_start_time)::TIMESTAMPTZ;
  END IF;

  IF p_end_time IS NOT NULL THEN
    converted_end_time := (CURRENT_DATE || ' ' || p_end_time)::TIMESTAMPTZ;
    -- Handle overnight times (end_time < start_time means next day)
    IF converted_start_time IS NOT NULL AND converted_end_time < converted_start_time THEN
      converted_end_time := converted_end_time + INTERVAL '1 day';
    END IF;
  END IF;

  --------------------------------------------------------------------------
  -- C O N C U R R E N C Y   L O C K
  --------------------------------------------------------------------------
  -- One advisory lock per plan_id for the lifespan of the transaction.
  -- hashtext(..) → bigint fits pg_advisory_xact_lock(bigint)
  PERFORM pg_advisory_xact_lock(
    ('x' || substr(md5(p_plan_id::text), 1, 16))::bit(64)::bigint
  );

  --------------------------------------------------------------------------
  -- N E X T   O R D E R
  --------------------------------------------------------------------------
  SELECT COALESCE(MAX(stop_order), 0) + 1 INTO new_order
  FROM public.plan_stops
  WHERE plan_id = p_plan_id;

  --------------------------------------------------------------------------
  -- I N S E R T
  --------------------------------------------------------------------------
  INSERT INTO public.plan_stops (
    id,
    plan_id,
    title,
    description,
    start_time,
    end_time,
    duration_minutes,
    venue_id,
    estimated_cost_per_person,
    stop_order,
    created_by
  ) VALUES (
    gen_random_uuid(),
    p_plan_id,
    p_title,
    p_description,
    converted_start_time,
    converted_end_time,
    p_duration_minutes,
    p_venue_id,
    p_estimated_cost,
    new_order,
    auth.uid()
  ) RETURNING id INTO new_stop_id;

  RETURN new_stop_id;
END;
$$;