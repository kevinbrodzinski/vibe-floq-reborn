-- Enhanced Vibe Detection System Database Migration
-- Adds tables and enhancements for ML-powered vibe detection with location integration

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
                   WHERE table_name = 'proximity_events' AND column_name = 'vibe_context') THEN
        ALTER TABLE public.proximity_events ADD COLUMN vibe_context JSONB DEFAULT '{}';
    END IF;
    
    -- Add venue_context column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'proximity_events' AND column_name = 'venue_context') THEN
        ALTER TABLE public.proximity_events ADD COLUMN venue_context TEXT;
    END IF;
    
    -- Add accuracy_score column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'proximity_events' AND column_name = 'accuracy_score') THEN
        ALTER TABLE public.proximity_events ADD COLUMN accuracy_score DECIMAL(3,2) DEFAULT 0.5;
    END IF;
    
    -- Add ml_features column for storing ML analysis results
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'proximity_events' AND column_name = 'ml_features') THEN
        ALTER TABLE public.proximity_events ADD COLUMN ml_features JSONB DEFAULT '{}';
    END IF;
END $$;

-- ============================================================================
-- 3. ENHANCED HOTSPOT DETECTION SUPPORT
-- ============================================================================

-- Function to get enhanced vibe clusters with ML metrics
CREATE OR REPLACE FUNCTION public.get_enhanced_vibe_clusters(
    p_bounds GEOMETRY DEFAULT NULL,
    p_min_users INTEGER DEFAULT 3,
    p_vibe_filter vibe_enum DEFAULT NULL
)
RETURNS TABLE (
    cluster_id TEXT,
    center_lat DOUBLE PRECISION,
    center_lng DOUBLE PRECISION,
    user_count INTEGER,
    dominant_vibe vibe_enum,
    vibe_distribution JSONB,
    intensity DOUBLE PRECISION,
    momentum_score DOUBLE PRECISION,
    stability_index DOUBLE PRECISION,
    diversity_score DOUBLE PRECISION,
    prediction_confidence DOUBLE PRECISION,
    temporal_trend TEXT,
    social_density DOUBLE PRECISION,
    vibe_coherence DOUBLE PRECISION,
    created_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH cluster_base AS (
        SELECT 
            ST_ClusterKMeans(location, LEAST(20, COUNT(*)::integer / 3)) OVER() as cluster_id,
            location,
            vibe,
            user_id,
            updated_at
        FROM vibes_now 
        WHERE 
            (p_bounds IS NULL OR ST_Within(location, p_bounds))
            AND (p_vibe_filter IS NULL OR vibe = p_vibe_filter)
            AND expires_at > NOW()
    ),
    cluster_stats AS (
        SELECT 
            cluster_id,
            COUNT(*)::integer as user_count,
            ST_Centroid(ST_Collect(location)) as center,
            MODE() WITHIN GROUP (ORDER BY vibe) as dominant_vibe,
            jsonb_object_agg(vibe, vibe_count) as vibe_distribution,
            AVG(EXTRACT(EPOCH FROM (NOW() - updated_at))) as avg_age_seconds,
            STDDEV(EXTRACT(EPOCH FROM (NOW() - updated_at))) as age_stddev,
            MAX(updated_at) as latest_update
        FROM (
            SELECT 
                cluster_id,
                location,
                vibe,
                user_id,
                updated_at,
                COUNT(*) OVER (PARTITION BY cluster_id, vibe) as vibe_count
            FROM cluster_base
        ) cb
        GROUP BY cluster_id
        HAVING COUNT(*) >= p_min_users
    )
    SELECT 
        cs.cluster_id::text,
        ST_Y(cs.center) as center_lat,
        ST_X(cs.center) as center_lng,
        cs.user_count,
        cs.dominant_vibe,
        cs.vibe_distribution,
        
        -- Calculate intensity (0-1 based on user density)
        LEAST(1.0, cs.user_count::double precision / 50.0) as intensity,
        
        -- Calculate momentum (0-1 based on recent activity)
        GREATEST(0.0, 1.0 - (cs.avg_age_seconds / 3600.0)) as momentum_score,
        
        -- Calculate stability (0-1 based on age consistency)
        CASE 
            WHEN cs.age_stddev IS NULL OR cs.age_stddev = 0 THEN 1.0
            ELSE GREATEST(0.0, 1.0 - (cs.age_stddev / 1800.0))
        END as stability_index,
        
        -- Calculate diversity (Shannon entropy of vibe distribution)
        GREATEST(0.0, LEAST(1.0, 
            -SUM((vibe_count::double precision / cs.user_count) * 
                 LOG(vibe_count::double precision / cs.user_count)) / LOG(10)
        )) as diversity_score,
        
        -- Prediction confidence (based on cluster size and stability)
        LEAST(1.0, (cs.user_count::double precision / 20.0) * 
                   CASE WHEN cs.age_stddev IS NULL THEN 1.0 
                        ELSE GREATEST(0.5, 1.0 - (cs.age_stddev / 3600.0)) END
        ) as prediction_confidence,
        
        -- Temporal trend
        CASE 
            WHEN cs.avg_age_seconds < 300 THEN 'rising'
            WHEN cs.avg_age_seconds > 1800 THEN 'falling'
            ELSE 'stable'
        END as temporal_trend,
        
        -- Social density (users per square km approximation)
        cs.user_count::double precision as social_density,
        
        -- Vibe coherence (1 - diversity for coherence measure)
        1.0 - GREATEST(0.0, LEAST(1.0, 
            -SUM((vibe_count::double precision / cs.user_count) * 
                 LOG(vibe_count::double precision / cs.user_count)) / LOG(10)
        )) as vibe_coherence,
        
        cs.latest_update as created_at
        
    FROM cluster_stats cs
    CROSS JOIN LATERAL (
        SELECT 
            (value->>'key')::vibe_enum as vibe_key,
            (value->>'value')::integer as vibe_count
        FROM jsonb_each(cs.vibe_distribution)
    ) vibe_breakdown
    GROUP BY cs.cluster_id, cs.center, cs.user_count, cs.dominant_vibe, 
             cs.vibe_distribution, cs.avg_age_seconds, cs.age_stddev, cs.latest_update
    ORDER BY intensity DESC, user_count DESC;
END;
$$;

-- Function to get hotspot time series data for predictions
CREATE OR REPLACE FUNCTION public.get_hotspot_time_series(
    p_cluster_id TEXT,
    p_hours_back INTEGER DEFAULT 24
)
RETURNS TABLE (
    hour_bucket TIMESTAMPTZ,
    user_count INTEGER,
    dominant_vibe vibe_enum,
    avg_intensity DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        date_trunc('hour', vl.ts) as hour_bucket,
        COUNT(DISTINCT vl.user_id)::integer as user_count,
        MODE() WITHIN GROUP (ORDER BY vl.vibe) as dominant_vibe,
        AVG(CASE 
            WHEN vl.venue_id IS NOT NULL THEN 0.8  -- Higher intensity at venues
            ELSE 0.5
        END) as avg_intensity
    FROM vibes_log vl
    WHERE 
        vl.ts >= NOW() - (p_hours_back || ' hours')::interval
        AND ST_DWithin(
            vl.location, 
            (SELECT ST_Point(center_lng, center_lat) 
             FROM get_enhanced_vibe_clusters() 
             WHERE cluster_id = p_cluster_id 
             LIMIT 1), 
            100  -- 100 meter radius
        )
    GROUP BY date_trunc('hour', vl.ts)
    ORDER BY hour_bucket;
END;
$$;

-- ============================================================================
-- 4. INDEXES FOR PERFORMANCE
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

-- Enhanced indexes for proximity events with vibe context
CREATE INDEX IF NOT EXISTS idx_proximity_events_vibe_context 
ON public.proximity_events USING GIN(vibe_context) 
WHERE vibe_context IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_proximity_events_ml_features 
ON public.proximity_events USING GIN(ml_features) 
WHERE ml_features IS NOT NULL;

-- ============================================================================
-- 5. ROW LEVEL SECURITY
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
-- 6. GRANTS AND PERMISSIONS
-- ============================================================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.vibe_system_metrics TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vibe_user_learning TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.location_vibe_patterns TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.get_enhanced_vibe_clusters TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_hotspot_time_series TO authenticated;

-- ============================================================================
-- 7. CLEANUP AND MAINTENANCE FUNCTIONS
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
-- 8. INITIAL DATA AND CONFIGURATION
-- ============================================================================

-- Insert initial system health record
INSERT INTO public.vibe_system_metrics (measurement_type, metrics) 
VALUES ('system_health', '{"version": "1.0", "initialized": true, "timestamp": "' || NOW() || '"}')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 9. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.vibe_system_metrics IS 'Stores ML model accuracy metrics and system health data for the enhanced vibe detection system';
COMMENT ON TABLE public.vibe_user_learning IS 'Stores user corrections and learning patterns for personalized vibe detection';
COMMENT ON TABLE public.location_vibe_patterns IS 'Stores location-vibe correlations and patterns for context-aware detection';

COMMENT ON FUNCTION public.get_enhanced_vibe_clusters IS 'Returns enhanced vibe clusters with ML-computed metrics for hotspot detection';
COMMENT ON FUNCTION public.get_hotspot_time_series IS 'Returns time series data for hotspot prediction and trend analysis';
COMMENT ON FUNCTION public.cleanup_old_vibe_metrics IS 'Cleans up old metrics and learning data to maintain performance';