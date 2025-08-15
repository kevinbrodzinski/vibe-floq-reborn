-- Fix function overloading conflict by dropping the old TIME-based version
-- This ensures only the TEXT-based version exists (which handles TIMESTAMPTZ conversion)

DROP FUNCTION IF EXISTS public.add_plan_stop_with_order(
  UUID, TEXT, TEXT, TIME WITHOUT TIME ZONE, TIME WITHOUT TIME ZONE, INTEGER, UUID, NUMERIC
);