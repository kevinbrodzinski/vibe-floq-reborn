-- Create venue scheduler jobs table
CREATE TABLE IF NOT EXISTS public.venue_scheduler_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('venue_sync', 'venue_intelligence', 'venue_cleanup', 'popularity_update')),
  priority INTEGER NOT NULL DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  
  -- Job parameters
  location JSONB, -- {lat: number, lng: number, radius?: number}
  venue_ids TEXT[], -- Array of venue IDs to process
  metadata JSONB, -- Additional job-specific data
  
  -- Scheduling
  scheduled_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  
  -- Execution tracking
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  result JSONB, -- Job execution result
  error TEXT, -- Error message if failed
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_venue_scheduler_jobs_status_scheduled 
ON public.venue_scheduler_jobs(status, scheduled_at) 
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_venue_scheduler_jobs_type_status 
ON public.venue_scheduler_jobs(type, status);

CREATE INDEX IF NOT EXISTS idx_venue_scheduler_jobs_completed_at 
ON public.venue_scheduler_jobs(completed_at) 
WHERE completed_at IS NOT NULL;

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_venue_scheduler_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER venue_scheduler_jobs_updated_at
  BEFORE UPDATE ON public.venue_scheduler_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_venue_scheduler_jobs_updated_at();

-- Enhance sync_log table if it doesn't have the right structure
DO $$
BEGIN
  -- Add metadata column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sync_log' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.sync_log ADD COLUMN metadata JSONB;
  END IF;
  
  -- Add kind column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sync_log' AND column_name = 'kind'
  ) THEN
    ALTER TABLE public.sync_log ADD COLUMN kind TEXT DEFAULT 'places';
  END IF;
END $$;

-- Create venue intelligence cache table
CREATE TABLE IF NOT EXISTS public.venue_intelligence_cache (
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  enhanced_categories TEXT[],
  confidence_score NUMERIC,
  popularity_trend TEXT CHECK (popularity_trend IN ('rising', 'stable', 'declining')),
  best_times TEXT[],
  crowd_level TEXT CHECK (crowd_level IN ('low', 'medium', 'high')),
  vibe_classification TEXT,
  recommendation_score INTEGER,
  similar_venues UUID[],
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  PRIMARY KEY (venue_id)
);

-- Create index for venue intelligence lookups
CREATE INDEX IF NOT EXISTS idx_venue_intelligence_cache_updated_at 
ON public.venue_intelligence_cache(updated_at);

CREATE INDEX IF NOT EXISTS idx_venue_intelligence_cache_recommendation_score 
ON public.venue_intelligence_cache(recommendation_score DESC);

-- Create trigger to update venue intelligence cache updated_at
CREATE OR REPLACE FUNCTION update_venue_intelligence_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER venue_intelligence_cache_updated_at
  BEFORE UPDATE ON public.venue_intelligence_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_venue_intelligence_cache_updated_at();

-- Create venue sync statistics view
CREATE OR REPLACE VIEW public.venue_sync_stats AS
SELECT 
  COUNT(*) as total_syncs,
  COUNT(*) FILTER (WHERE metadata->>'result'->>'ok' = 'true') as successful_syncs,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as syncs_last_24h,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as syncs_last_week,
  AVG(CASE 
    WHEN metadata->>'result'->>'total_venues' IS NOT NULL 
    THEN (metadata->>'result'->>'total_venues')::INTEGER 
    ELSE 0 
  END) as avg_venues_per_sync,
  MAX(created_at) as last_sync_at
FROM public.sync_log 
WHERE kind = 'automated_venue_sync';

-- Create venue intelligence summary view
CREATE OR REPLACE VIEW public.venue_intelligence_summary AS
SELECT 
  COUNT(*) as total_venues_analyzed,
  COUNT(*) FILTER (WHERE confidence_score >= 70) as high_confidence_venues,
  COUNT(*) FILTER (WHERE popularity_trend = 'rising') as rising_venues,
  COUNT(*) FILTER (WHERE popularity_trend = 'declining') as declining_venues,
  COUNT(*) FILTER (WHERE crowd_level = 'high') as high_crowd_venues,
  AVG(confidence_score) as avg_confidence_score,
  AVG(recommendation_score) as avg_recommendation_score,
  MAX(updated_at) as last_analysis_at
FROM public.venue_intelligence_cache;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.venue_scheduler_jobs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.venue_intelligence_cache TO authenticated;
GRANT SELECT ON public.venue_sync_stats TO authenticated;
GRANT SELECT ON public.venue_intelligence_summary TO authenticated;

-- Grant service role full access
GRANT ALL ON public.venue_scheduler_jobs TO service_role;
GRANT ALL ON public.venue_intelligence_cache TO service_role;
GRANT ALL ON public.venue_sync_stats TO service_role;
GRANT ALL ON public.venue_intelligence_summary TO service_role;

-- Create RLS policies
ALTER TABLE public.venue_scheduler_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_intelligence_cache ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY venue_scheduler_jobs_service_role 
ON public.venue_scheduler_jobs 
FOR ALL 
TO service_role 
USING (true);

CREATE POLICY venue_intelligence_cache_service_role 
ON public.venue_intelligence_cache 
FOR ALL 
TO service_role 
USING (true);

-- Allow authenticated users to read
CREATE POLICY venue_scheduler_jobs_read 
ON public.venue_scheduler_jobs 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY venue_intelligence_cache_read 
ON public.venue_intelligence_cache 
FOR SELECT 
TO authenticated 
USING (true);