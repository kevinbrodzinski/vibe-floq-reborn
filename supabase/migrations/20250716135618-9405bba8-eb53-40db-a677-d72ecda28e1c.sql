-- 1. Add time window fields to floq_plans table
ALTER TABLE public.floq_plans
ADD COLUMN IF NOT EXISTS start_time TIME,
ADD COLUMN IF NOT EXISTS end_time TIME,
ADD COLUMN IF NOT EXISTS duration_hours INTEGER
  GENERATED ALWAYS AS (
    CASE 
      WHEN start_time IS NOT NULL AND end_time IS NOT NULL THEN
        CASE 
          WHEN end_time >= start_time THEN 
            FLOOR(EXTRACT(EPOCH FROM (end_time - start_time)) / 3600)
          ELSE 
            24 - FLOOR(EXTRACT(EPOCH FROM (start_time - end_time)) / 3600)
        END
      ELSE NULL
    END
  ) STORED;

-- 2. Create plan_stops table for timeline positioning
CREATE TABLE IF NOT EXISTS public.plan_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.floq_plans(id) ON DELETE CASCADE,
  venue_id UUID REFERENCES public.venues(id),

  -- Stop details
  title TEXT NOT NULL,
  description TEXT,
  address TEXT,

  -- Timeline positioning
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes INTEGER
    GENERATED ALWAYS AS (
      FLOOR(EXTRACT(EPOCH FROM (end_time - start_time)) / 60)
    ) STORED,
  stop_order INTEGER DEFAULT 0,

  -- Cost estimation
  estimated_cost_per_person NUMERIC,

  -- Metadata and tracking
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT valid_time_range CHECK (
    (
      end_time > start_time
    ) OR (
      start_time >= TIME '20:00' AND end_time <= TIME '06:00'
    )
  )
);

-- 3. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_plan_stops_plan_time 
  ON public.plan_stops (plan_id, start_time);

CREATE INDEX IF NOT EXISTS idx_plan_stops_order 
  ON public.plan_stops (plan_id, stop_order);

CREATE INDEX IF NOT EXISTS idx_plan_stops_venue 
  ON public.plan_stops (venue_id);

-- 4. Enable RLS
ALTER TABLE public.plan_stops ENABLE ROW LEVEL SECURITY;

-- 5. RLS policies for plan_stops
CREATE POLICY "Users can view stops of accessible plans"
  ON public.plan_stops FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.plan_participants pp
      WHERE pp.plan_id = plan_stops.plan_id AND pp.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.floq_plans fp
      JOIN public.floq_participants fpar ON fpar.floq_id = fp.floq_id
      WHERE fp.id = plan_stops.plan_id AND fpar.user_id = auth.uid()
    )
  );

CREATE POLICY "Plan participants can manage stops"
  ON public.plan_stops FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.plan_participants pp
      WHERE pp.plan_id = plan_stops.plan_id AND pp.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.floq_plans fp
      JOIN public.floq_participants fpar ON fpar.floq_id = fp.floq_id
      WHERE fp.id = plan_stops.plan_id AND fpar.user_id = auth.uid()
    )
  )
  WITH CHECK (
    (
      created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.plan_participants pp
        WHERE pp.plan_id = plan_stops.plan_id AND pp.user_id = auth.uid()
      )
    )
  );

-- 6. Validate stop overlap within the same plan
CREATE OR REPLACE FUNCTION public.validate_stop_times(p_plan_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM plan_stops a
    JOIN plan_stops b ON a.plan_id = b.plan_id AND a.id != b.id
    WHERE a.plan_id = p_plan_id
      AND (
        (a.start_time < b.end_time AND a.end_time > b.start_time)
      )
  ) THEN
    RAISE EXCEPTION 'Plan contains overlapping stops';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_stop_times(UUID) TO authenticated;

-- 7. Trigger to auto-update timestamp on changes
CREATE OR REPLACE FUNCTION public.update_plan_stops_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_plan_stops_updated_at
  BEFORE UPDATE ON public.plan_stops
  FOR EACH ROW EXECUTE FUNCTION public.update_plan_stops_updated_at();