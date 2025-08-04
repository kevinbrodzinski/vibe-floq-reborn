-- Enhanced Vibe Detection System Database Migration - SQL Editor Safe Version
-- This version is optimized for running directly in the Supabase SQL editor

-- ============================================================================
-- 1. VIBE ANALYSIS ENHANCEMENTS
-- ============================================================================

-- Table for storing ML model accuracy metrics and system health
CREATE TABLE IF NOT EXISTS public.vibe_system_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- System identification
    system_version TEXT NOT NULL DEFAULT '1.0',
    measurement_type TEXT NOT NULL CHECK (measurement_type IN ('accuracy', 'performance', 'learning', 'system_health')),
    
    -- Metrics data
    metrics JSONB NOT NULL,
    
    -- Contextual information
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL for system-wide metrics
    session_id TEXT,
    
    -- Timestamps
    measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_metrics CHECK (jsonb_typeof(metrics) = 'object')
);

-- Table for storing user learning patterns and corrections
CREATE TABLE IF NOT EXISTS public.vibe_user_learning (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Learning data
    correction_data JSONB NOT NULL,
    context_data JSONB NOT NULL,
    
    -- Correction details
    original_vibe vibe_enum NOT NULL,
    corrected_vibe vibe_enum NOT NULL,
    confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    
    -- Context factors
    location_context JSONB,
    sensor_context JSONB,
    temporal_context JSONB,
    
    -- Learning metadata
    correction_strength DECIMAL(3,2) DEFAULT 0.5,
    context_similarity DECIMAL(3,2) DEFAULT 0.0,
    user_confidence DECIMAL(3,2) DEFAULT 0.5,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT different_vibes CHECK (original_vibe != corrected_vibe),
    CONSTRAINT valid_correction_data CHECK (jsonb_typeof(correction_data) = 'object'),
    CONSTRAINT valid_context_data CHECK (jsonb_typeof(context_data) = 'object')
);

-- Table for storing location-vibe correlations and patterns
CREATE TABLE IF NOT EXISTS public.location_vibe_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Location identification
    venue_id TEXT, -- From venue detection system
    location_hash TEXT NOT NULL, -- Geohash for location clustering
    location GEOMETRY(POINT, 4326),
    
    -- Vibe pattern data
    vibe vibe_enum NOT NULL,
    confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    accuracy DECIMAL(3,2) NOT NULL CHECK (accuracy >= 0 AND accuracy <= 1),
    frequency INTEGER NOT NULL DEFAULT 1,
    
    -- Context information
    location_context JSONB NOT NULL DEFAULT '{}',
    temporal_patterns JSONB NOT NULL DEFAULT '{}',
    
    -- Timestamps
    first_detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Unique constraint for user-location-vibe combinations
    UNIQUE(user_id, location_hash, vibe)
);

-- ============================================================================
-- 2. ENHANCED PROXIMITY EVENTS (Extend existing table)
-- ============================================================================

-- Add vibe context to existing proximity_events table if columns don't exist
DO $$ 
BEGIN
    -- Add vibe_context column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'proximity_events' AND column_name = 'vibe_context') THEN
        ALTER TABLE public.proximity_events ADD COLUMN vibe_context JSONB DEFAULT '{}';
    END IF;
    
    -- Add venue_context column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'proximity_events' AND column_name = 'venue_context') THEN
        ALTER TABLE public.proximity_events ADD COLUMN venue_context TEXT;
    END IF;
    
    -- Add accuracy_score column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'proximity_events' AND column_name = 'accuracy_score') THEN
        ALTER TABLE public.proximity_events ADD COLUMN accuracy_score DECIMAL(3,2) DEFAULT 0.5;
    END IF;
    
    -- Add ml_features column for storing ML analysis results
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'proximity_events' AND column_name = 'ml_features') THEN
        ALTER TABLE public.proximity_events ADD COLUMN ml_features JSONB DEFAULT '{}';
    END IF;
EXCEPTION
    WHEN undefined_table THEN
        -- proximity_events table doesn't exist yet, skip this section
        RAISE NOTICE 'proximity_events table does not exist, skipping column additions';
END $$;

-- ============================================================================
-- 3. BASIC INDEXES (Non-CONCURRENT for SQL editor)
-- ============================================================================

-- Indexes for vibe system metrics
CREATE INDEX IF NOT EXISTS idx_vibe_system_metrics_type_time 
ON public.vibe_system_metrics(measurement_type, measured_at DESC);

CREATE INDEX IF NOT EXISTS idx_vibe_system_metrics_user_time 
ON public.vibe_system_metrics(user_id, measured_at DESC) 
WHERE user_id IS NOT NULL;

-- Indexes for user learning
CREATE INDEX IF NOT EXISTS idx_vibe_user_learning_user_time 
ON public.vibe_user_learning(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_vibe_user_learning_vibes 
ON public.vibe_user_learning(original_vibe, corrected_vibe);

CREATE INDEX IF NOT EXISTS idx_vibe_user_learning_context 
ON public.vibe_user_learning USING GIN(context_data);

-- Indexes for location-vibe patterns
CREATE INDEX IF NOT EXISTS idx_location_vibe_patterns_user_venue 
ON public.location_vibe_patterns(user_id, venue_id) 
WHERE venue_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_location_vibe_patterns_location_hash 
ON public.location_vibe_patterns(location_hash);

CREATE INDEX IF NOT EXISTS idx_location_vibe_patterns_location_gist 
ON public.location_vibe_patterns USING GIST(location);

CREATE INDEX IF NOT EXISTS idx_location_vibe_patterns_vibe_freq 
ON public.location_vibe_patterns(vibe, frequency DESC);

-- ============================================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE public.vibe_system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vibe_user_learning ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_vibe_patterns ENABLE ROW LEVEL SECURITY;

-- Policies for vibe system metrics
CREATE POLICY "Users can view their own metrics" 
ON public.vibe_system_metrics FOR SELECT 
USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "System can insert metrics" 
ON public.vibe_system_metrics FOR INSERT 
WITH CHECK (true); -- Allow system inserts

-- Policies for user learning
CREATE POLICY "Users can manage their own learning data" 
ON public.vibe_user_learning FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Policies for location-vibe patterns
CREATE POLICY "Users can manage their own location patterns" 
ON public.location_vibe_patterns FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 5. GRANTS AND PERMISSIONS
-- ============================================================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.vibe_system_metrics TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vibe_user_learning TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.location_vibe_patterns TO authenticated;

-- ============================================================================
-- 6. BASIC FUNCTIONS (Complex clustering functions separated)
-- ============================================================================

-- Function to clean up old metrics data
CREATE OR REPLACE FUNCTION public.cleanup_old_vibe_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Keep only last 30 days of user-specific metrics
    DELETE FROM public.vibe_system_metrics 
    WHERE user_id IS NOT NULL 
    AND measured_at < NOW() - INTERVAL '30 days';
    
    -- Keep only last 7 days of system-wide metrics
    DELETE FROM public.vibe_system_metrics 
    WHERE user_id IS NULL 
    AND measured_at < NOW() - INTERVAL '7 days';
    
    -- Keep only last 90 days of learning data
    DELETE FROM public.vibe_user_learning 
    WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.cleanup_old_vibe_metrics TO authenticated;

-- ============================================================================
-- 7. INITIAL DATA AND CONFIGURATION
-- ============================================================================

-- Insert initial system health record
INSERT INTO public.vibe_system_metrics (measurement_type, metrics) 
VALUES ('system_health', '{"version": "1.0", "initialized": true, "timestamp": "' || NOW() || '"}')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 8. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.vibe_system_metrics IS 'Stores ML model accuracy metrics and system health data for the enhanced vibe detection system';
COMMENT ON TABLE public.vibe_user_learning IS 'Stores user corrections and learning patterns for personalized vibe detection';
COMMENT ON TABLE public.location_vibe_patterns IS 'Stores location-vibe correlations and patterns for context-aware detection';
COMMENT ON FUNCTION public.cleanup_old_vibe_metrics IS 'Cleans up old metrics and learning data to maintain performance';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Enhanced Vibe Detection System migration completed successfully!';
    RAISE NOTICE 'Created tables: vibe_system_metrics, vibe_user_learning, location_vibe_patterns';
    RAISE NOTICE 'Enhanced proximity_events table with vibe context (if it exists)';
    RAISE NOTICE 'Next step: Run the advanced functions migration separately if needed';
END $$;