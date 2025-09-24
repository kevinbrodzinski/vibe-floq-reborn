-- Advanced Vibe Detection Functions - Run after main migration
-- These are the complex clustering and analysis functions

-- ============================================================================
-- ENHANCED HOTSPOT DETECTION FUNCTIONS
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

-- Function to get user vibe learning insights
CREATE OR REPLACE FUNCTION public.get_user_vibe_insights(
    p_profile_id UUID DEFAULT auth.uid(),
    p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
    total_corrections INTEGER,
    accuracy_trend DOUBLE PRECISION,
    most_corrected_from vibe_enum,
    most_corrected_to vibe_enum,
    learning_velocity DOUBLE PRECISION,
    consistency_score DOUBLE PRECISION,
    top_locations JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH learning_stats AS (
        SELECT 
            COUNT(*)::integer as total_corrections,
            AVG(confidence) as avg_confidence,
            MODE() WITHIN GROUP (ORDER BY original_vibe) as most_corrected_from,
            MODE() WITHIN GROUP (ORDER BY corrected_vibe) as most_corrected_to,
            STDDEV(correction_strength) as consistency_stddev,
            COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::double precision / 
            GREATEST(1, COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '14 days' AND created_at < NOW() - INTERVAL '7 days')) as learning_velocity
        FROM vibe_user_learning
        WHERE profile_id = p_profile_id
        AND created_at >= NOW() - (p_days_back || ' days')::interval
    ),
    location_patterns AS (
        SELECT 
            jsonb_agg(
                jsonb_build_object(
                    'location_hash', location_hash,
                    'vibe', vibe,
                    'frequency', frequency,
                    'accuracy', accuracy
                ) ORDER BY frequency DESC
            ) FILTER (WHERE rn <= 5) as top_locations
        FROM (
            SELECT 
                location_hash,
                vibe,
                frequency,
                accuracy,
                ROW_NUMBER() OVER (ORDER BY frequency DESC) as rn
            FROM location_vibe_patterns
            WHERE profile_id = p_profile_id
        ) ranked_locations
    )
    SELECT 
        COALESCE(ls.total_corrections, 0),
        COALESCE(ls.avg_confidence, 0.5),
        ls.most_corrected_from,
        ls.most_corrected_to,
        COALESCE(ls.learning_velocity, 1.0),
        CASE 
            WHEN ls.consistency_stddev IS NULL THEN 0.5
            ELSE GREATEST(0.0, 1.0 - ls.consistency_stddev)
        END,
        COALESCE(lp.top_locations, '[]'::jsonb)
    FROM learning_stats ls
    CROSS JOIN location_patterns lp;
END;
$$;

-- ============================================================================
-- ADDITIONAL INDEXES FOR PROXIMITY EVENTS (if they exist)
-- ============================================================================

DO $$
BEGIN
    -- Only create these indexes if proximity_events table exists and has the new columns
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proximity_events') AND
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proximity_events' AND column_name = 'vibe_context') THEN
        
        -- Create indexes for enhanced proximity events
        CREATE INDEX IF NOT EXISTS idx_proximity_events_vibe_context 
        ON public.proximity_events USING GIN(vibe_context) 
        WHERE vibe_context IS NOT NULL;
        
        CREATE INDEX IF NOT EXISTS idx_proximity_events_ml_features 
        ON public.proximity_events USING GIN(ml_features) 
        WHERE ml_features IS NOT NULL;
        
        RAISE NOTICE 'Created enhanced proximity_events indexes';
    ELSE
        RAISE NOTICE 'proximity_events table or vibe_context column not found, skipping enhanced indexes';
    END IF;
END $$;

-- ============================================================================
-- GRANTS AND PERMISSIONS
-- ============================================================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.get_enhanced_vibe_clusters TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_hotspot_time_series TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_vibe_insights TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION public.get_enhanced_vibe_clusters IS 'Returns enhanced vibe clusters with ML-computed metrics for hotspot detection';
COMMENT ON FUNCTION public.get_hotspot_time_series IS 'Returns time series data for hotspot prediction and trend analysis';
COMMENT ON FUNCTION public.get_user_vibe_insights IS 'Returns personalized learning insights and statistics for a user';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Advanced vibe detection functions installed successfully!';
    RAISE NOTICE 'Available functions: get_enhanced_vibe_clusters, get_hotspot_time_series, get_user_vibe_insights';
END $$;