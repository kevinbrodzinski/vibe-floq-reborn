-- Phase 4: Atmospheric Effects - Database Schema

-- Flow samples table for learning trade wind patterns
CREATE TABLE IF NOT EXISTS public.flow_samples (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  city_id UUID NOT NULL DEFAULT gen_random_uuid(), -- Could link to cities table later
  hour_bucket INTEGER NOT NULL CHECK (hour_bucket >= 0 AND hour_bucket <= 23),
  dow INTEGER NOT NULL CHECK (dow >= 0 AND dow <= 6), -- 0=Sunday
  cell_x INTEGER NOT NULL,
  cell_y INTEGER NOT NULL,
  vx REAL NOT NULL,
  vy REAL NOT NULL,
  weight REAL NOT NULL DEFAULT 1.0,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trade winds materialized patterns table
CREATE TABLE IF NOT EXISTS public.trade_winds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  city_id UUID NOT NULL,
  hour_bucket INTEGER NOT NULL CHECK (hour_bucket >= 0 AND hour_bucket <= 23),
  dow INTEGER NOT NULL CHECK (dow >= 0 AND dow <= 6),
  path_id UUID NOT NULL DEFAULT gen_random_uuid(),
  points JSONB NOT NULL DEFAULT '[]'::jsonb,
  strength REAL NOT NULL DEFAULT 0.0 CHECK (strength >= 0.0 AND strength <= 1.0),
  avg_speed REAL NOT NULL DEFAULT 0.0,
  support REAL NOT NULL DEFAULT 0.0 CHECK (support >= 0.0 AND support <= 1.0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_flow_samples_city_time ON public.flow_samples(city_id, hour_bucket, dow);
CREATE INDEX IF NOT EXISTS idx_flow_samples_recorded ON public.flow_samples(recorded_at);
CREATE INDEX IF NOT EXISTS idx_flow_samples_cell ON public.flow_samples(cell_x, cell_y);

CREATE INDEX IF NOT EXISTS idx_trade_winds_city_time ON public.trade_winds(city_id, hour_bucket, dow);
CREATE INDEX IF NOT EXISTS idx_trade_winds_updated ON public.trade_winds(updated_at);

-- RLS Policies for k-anonymity and city scoping
ALTER TABLE public.flow_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_winds ENABLE ROW LEVEL SECURITY;

-- Flow samples: Only allow reading aggregated data with k≥5
CREATE POLICY "flow_samples_k_anon_read" ON public.flow_samples
  FOR SELECT
  USING (
    (SELECT COUNT(*) 
     FROM public.flow_samples fs2 
     WHERE fs2.city_id = flow_samples.city_id 
       AND fs2.hour_bucket = flow_samples.hour_bucket 
       AND fs2.dow = flow_samples.dow
       AND fs2.cell_x = flow_samples.cell_x 
       AND fs2.cell_y = flow_samples.cell_y) >= 5
  );

-- Trade winds: Public read access for patterns
CREATE POLICY "trade_winds_public_read" ON public.trade_winds
  FOR SELECT
  USING (true);

-- Service role can manage all data
CREATE POLICY "flow_samples_service_manage" ON public.flow_samples
  FOR ALL
  USING (current_setting('request.jwt.claim.role', true) = 'service_role')
  WITH CHECK (current_setting('request.jwt.claim.role', true) = 'service_role');

CREATE POLICY "trade_winds_service_manage" ON public.trade_winds
  FOR ALL
  USING (current_setting('request.jwt.claim.role', true) = 'service_role')
  WITH CHECK (current_setting('request.jwt.claim.role', true) = 'service_role');