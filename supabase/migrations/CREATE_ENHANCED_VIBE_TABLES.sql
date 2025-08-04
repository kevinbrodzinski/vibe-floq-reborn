-- CREATE ENHANCED VIBE DETECTION TABLES
-- Run this FIRST if the enhanced vibe tables don't exist yet
-- This creates them with profile_id from the start

-- ============================================================================
-- 1. CREATE ENHANCED VIBE DETECTION TABLES (with profile_id)
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
    profile_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL for system-wide metrics
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
    profile_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
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
    profile_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
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
    
    -- Unique constraint for profile-location-vibe combinations
    UNIQUE(profile_id, location_hash, vibe)
);

-- ============================================================================
-- 2. ENHANCE PROXIMITY EVENTS TABLE (if it exists)
-- ============================================================================

-- Add vibe context to existing proximity_events table if columns don't exist
DO $$ 
BEGIN
    -- Add vibe_context column if it doesn't exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proximity_events') THEN
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
        
        RAISE NOTICE 'Enhanced proximity_events table with vibe context columns';
    ELSE
        RAISE NOTICE 'proximity_events table does not exist, skipping enhancement';
    END IF;
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'proximity_events table does not exist, skipping column additions';
END $$;

-- ============================================================================
-- 3. CREATE INDEXES
-- ============================================================================

-- Indexes for vibe system metrics
CREATE INDEX IF NOT EXISTS idx_vibe_system_metrics_type_time 
ON public.vibe_system_metrics(measurement_type, measured_at DESC);

CREATE INDEX IF NOT EXISTS idx_vibe_system_metrics_profile_time 
ON public.vibe_system_metrics(profile_id, measured_at DESC) 
WHERE profile_id IS NOT NULL;

-- Indexes for user learning
CREATE INDEX IF NOT EXISTS idx_vibe_user_learning_profile_time 
ON public.vibe_user_learning(profile_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_vibe_user_learning_vibes 
ON public.vibe_user_learning(original_vibe, corrected_vibe);

CREATE INDEX IF NOT EXISTS idx_vibe_user_learning_context 
ON public.vibe_user_learning USING GIN(context_data);

-- Indexes for location-vibe patterns
CREATE INDEX IF NOT EXISTS idx_location_vibe_patterns_profile_venue 
ON public.location_vibe_patterns(profile_id, venue_id) 
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
USING (profile_id IS NULL OR auth.uid() = profile_id);

CREATE POLICY "System can insert metrics" 
ON public.vibe_system_metrics FOR INSERT 
WITH CHECK (true); -- Allow system inserts

-- Policies for user learning
CREATE POLICY "Users can manage their own learning data" 
ON public.vibe_user_learning FOR ALL 
USING (auth.uid() = profile_id) 
WITH CHECK (auth.uid() = profile_id);

-- Policies for location-vibe patterns
CREATE POLICY "Users can manage their own location patterns" 
ON public.location_vibe_patterns FOR ALL 
USING (auth.uid() = profile_id) 
WITH CHECK (auth.uid() = profile_id);

-- ============================================================================
-- 5. GRANTS AND PERMISSIONS
-- ============================================================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.vibe_system_metrics TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vibe_user_learning TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.location_vibe_patterns TO authenticated;

-- ============================================================================
-- 6. FUNCTIONS
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
    WHERE profile_id IS NOT NULL 
    AND measured_at < NOW() - INTERVAL '30 days';
    
    -- Keep only last 7 days of system-wide metrics
    DELETE FROM public.vibe_system_metrics 
    WHERE profile_id IS NULL 
    AND measured_at < NOW() - INTERVAL '7 days';
    
    -- Keep only last 90 days of learning data
    DELETE FROM public.vibe_user_learning 
    WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.cleanup_old_vibe_metrics TO authenticated;

-- ============================================================================
-- 7. INITIAL DATA AND COMMENTS
-- ============================================================================

-- Insert initial system health record
INSERT INTO public.vibe_system_metrics (measurement_type, metrics) 
VALUES ('system_health', jsonb_build_object(
    'version', '1.0',
    'initialized', true,
    'timestamp', NOW()::text
))
ON CONFLICT DO NOTHING;

-- Add table comments
COMMENT ON TABLE public.vibe_system_metrics IS 'Stores ML model accuracy metrics and system health data for the enhanced vibe detection system';
COMMENT ON TABLE public.vibe_user_learning IS 'Stores user corrections and learning patterns for personalized vibe detection';
COMMENT ON TABLE public.location_vibe_patterns IS 'Stores location-vibe correlations and patterns for context-aware detection';
COMMENT ON FUNCTION public.cleanup_old_vibe_metrics IS 'Cleans up old metrics and learning data to maintain performance';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== ENHANCED VIBE DETECTION TABLES CREATED ===';
    RAISE NOTICE 'Created tables: vibe_system_metrics, vibe_user_learning, location_vibe_patterns';
    RAISE NOTICE 'Enhanced proximity_events table with vibe context (if it exists)';
    RAISE NOTICE 'All tables use profile_id for user references';
    RAISE NOTICE '=== READY FOR ENHANCED VIBE DETECTION ===';
END $$;