-- =====================================================
-- Friend Detection System Database Functions
-- =====================================================

-- Create tables for storing friend detection data
CREATE TABLE IF NOT EXISTS friendship_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_low UUID REFERENCES profiles(id) ON DELETE CASCADE,
    profile_high UUID REFERENCES profiles(id) ON DELETE CASCADE,
    analysis_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
    confidence_level TEXT NOT NULL CHECK (confidence_level IN ('low', 'medium', 'high', 'very_high')),
    signals_data JSONB NOT NULL DEFAULT '[]',
    relationship_type TEXT NOT NULL CHECK (relationship_type IN ('acquaintance', 'friend', 'close_friend', 'best_friend')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique analysis per profile pair
    UNIQUE(profile_low, profile_high),
    -- Ensure profile_low < profile_high for consistent ordering
    CHECK (profile_low < profile_high)
);

CREATE TABLE IF NOT EXISTS friend_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    suggested_friend_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
    confidence_level TEXT NOT NULL CHECK (confidence_level IN ('low', 'medium', 'high', 'very_high')),
    suggestion_reason TEXT NOT NULL,
    signals_summary JSONB NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'ignored')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    responded_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
    
    -- Ensure unique suggestion per profile pair
    UNIQUE(target_profile_id, suggested_friend_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_friendship_analysis_profiles ON friendship_analysis(profile_low, profile_high);
CREATE INDEX IF NOT EXISTS idx_friendship_analysis_score ON friendship_analysis(overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_friend_suggestions_target ON friend_suggestions(target_profile_id, status, score DESC);
CREATE INDEX IF NOT EXISTS idx_friend_suggestions_expires ON friend_suggestions(expires_at);

-- =====================================================
-- 🗺️ FUNCTION: Analyze Co-location Events
-- =====================================================
CREATE OR REPLACE FUNCTION analyze_co_location_events(
    profile_a_id UUID,
    profile_b_id UUID,
    time_window TIMESTAMP WITH TIME ZONE,
    radius_m INTEGER DEFAULT 100
)
RETURNS TABLE (
    venue_id TEXT,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    distance_m REAL
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH profile_a_presence AS (
        SELECT 
            vlp.venue_id,
            vlp.checked_in_at as start_time,
            COALESCE(vlp.checked_in_at + vlp.session_duration, vlp.expires_at) as end_time
        FROM venue_live_presence vlp
        WHERE vlp.user_id = profile_a_id 
        AND vlp.checked_in_at >= time_window
    ),
    profile_b_presence AS (
        SELECT 
            vlp.venue_id,
            vlp.checked_in_at as start_time,
            COALESCE(vlp.checked_in_at + vlp.session_duration, vlp.expires_at) as end_time
        FROM venue_live_presence vlp
        WHERE vlp.user_id = profile_b_id 
        AND vlp.checked_in_at >= time_window
    ),
    co_location_events AS (
        SELECT 
            a.venue_id,
            GREATEST(a.start_time, b.start_time) as overlap_start,
            LEAST(a.end_time, b.end_time) as overlap_end
        FROM profile_a_presence a
        JOIN profile_b_presence b ON a.venue_id = b.venue_id
        WHERE GREATEST(a.start_time, b.start_time) < LEAST(a.end_time, b.end_time)
    )
    SELECT 
        cle.venue_id,
        cle.overlap_start as start_time,
        cle.overlap_end as end_time,
        EXTRACT(EPOCH FROM (cle.overlap_end - cle.overlap_start))::INTEGER / 60 as duration_minutes,
        0::REAL as distance_m -- Placeholder for actual distance calculation
    FROM co_location_events cle
    ORDER BY cle.overlap_start DESC;
END;
$$;

-- =====================================================
-- 🎭 FUNCTION: Analyze Shared Floq Participation
-- =====================================================
CREATE OR REPLACE FUNCTION analyze_shared_floq_participation(
    profile_a_id UUID,
    profile_b_id UUID,
    time_window TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
    floq_id TEXT,
    activity_type TEXT,
    joined_at TIMESTAMP WITH TIME ZONE,
    floq_title TEXT,
    floq_vibe TEXT
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.id as floq_id,
        'floq_participation'::TEXT as activity_type,
        GREATEST(fp_a.joined_at, fp_b.joined_at) as joined_at,
        f.title as floq_title,
        f.primary_vibe::TEXT as floq_vibe
    FROM floqs f
    JOIN floq_participants fp_a ON f.id = fp_a.floq_id AND COALESCE(fp_a.user_id, fp_a.profile_id) = profile_a_id
    JOIN floq_participants fp_b ON f.id = fp_b.floq_id AND COALESCE(fp_b.user_id, fp_b.profile_id) = profile_b_id
    WHERE f.created_at >= time_window
    AND f.deleted_at IS NULL
    ORDER BY joined_at DESC;
END;
$$;

-- =====================================================
-- 📅 FUNCTION: Analyze Shared Plan Participation
-- =====================================================
CREATE OR REPLACE FUNCTION analyze_shared_plan_participation(
    profile_a_id UUID,
    profile_b_id UUID,
    time_window TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
    plan_id TEXT,
    activity_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    plan_title TEXT,
    plan_status TEXT
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fp.id as plan_id,
        'plan_attendance'::TEXT as activity_type,
        fp.created_at,
        fp.title as plan_title,
        fp.status as plan_status
    FROM floq_plans fp
    JOIN plan_participants pp_a ON fp.id = pp_a.plan_id AND COALESCE(pp_a.user_id, pp_a.profile_id) = profile_a_id
    JOIN plan_participants pp_b ON fp.id = pp_b.plan_id AND COALESCE(pp_b.user_id, pp_b.profile_id) = profile_b_id
    WHERE fp.created_at >= time_window
    AND fp.archived_at IS NULL
    ORDER BY fp.created_at DESC;
END;
$$;

-- =====================================================
-- 🏢 FUNCTION: Analyze Venue Overlap Patterns
-- =====================================================
CREATE OR REPLACE FUNCTION analyze_venue_overlap_patterns(
    profile_a_id UUID,
    profile_b_id UUID,
    time_window TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
    venue_id TEXT,
    profile_a_visits INTEGER,
    profile_b_visits INTEGER,
    overlap_score REAL
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH profile_a_venues AS (
        SELECT 
            vs.venue_id,
            COUNT(*) as visit_count
        FROM venue_stays vs
        WHERE vs.user_id = profile_a_id 
        AND vs.arrived_at >= time_window
        GROUP BY vs.venue_id
    ),
    profile_b_venues AS (
        SELECT 
            vs.venue_id,
            COUNT(*) as visit_count
        FROM venue_stays vs
        WHERE vs.user_id = profile_b_id 
        AND vs.arrived_at >= time_window
        GROUP BY vs.venue_id
    ),
    venue_overlap AS (
        SELECT 
            COALESCE(a.venue_id, b.venue_id) as venue_id,
            COALESCE(a.visit_count, 0) as profile_a_visits,
            COALESCE(b.visit_count, 0) as profile_b_visits
        FROM profile_a_venues a
        FULL OUTER JOIN profile_b_venues b ON a.venue_id = b.venue_id
        WHERE COALESCE(a.visit_count, 0) > 0 OR COALESCE(b.visit_count, 0) > 0
    )
    SELECT 
        vo.venue_id,
        vo.profile_a_visits,
        vo.profile_b_visits,
        CASE 
            WHEN vo.profile_a_visits > 0 AND vo.profile_b_visits > 0 
            THEN LEAST(vo.profile_a_visits, vo.profile_b_visits)::REAL / GREATEST(vo.profile_a_visits, vo.profile_b_visits)::REAL
            ELSE 0::REAL
        END as overlap_score
    FROM venue_overlap vo
    ORDER BY overlap_score DESC, (vo.profile_a_visits + vo.profile_b_visits) DESC;
END;
$$;

-- =====================================================
-- ⏰ FUNCTION: Analyze Time Sync Patterns
-- =====================================================
CREATE OR REPLACE FUNCTION analyze_time_sync_patterns(
    profile_a_id UUID,
    profile_b_id UUID,
    time_window_days INTEGER DEFAULT 90
)
RETURNS TABLE (
    sync_score REAL,
    common_windows JSONB
) 
LANGUAGE plpgsql
AS $$
DECLARE
    sync_result REAL := 0;
    common_activity_windows JSONB := '[]'::JSONB;
BEGIN
    -- Simplified time sync analysis based on venue presence overlap
    WITH profile_a_activity AS (
        SELECT 
            EXTRACT(HOUR FROM checked_in_at) as activity_hour,
            EXTRACT(DOW FROM checked_in_at) as day_of_week,
            COUNT(*) as activity_count
        FROM venue_live_presence
        WHERE user_id = profile_a_id 
        AND checked_in_at >= NOW() - (time_window_days || ' days')::INTERVAL
        GROUP BY EXTRACT(HOUR FROM checked_in_at), EXTRACT(DOW FROM checked_in_at)
    ),
    profile_b_activity AS (
        SELECT 
            EXTRACT(HOUR FROM checked_in_at) as activity_hour,
            EXTRACT(DOW FROM checked_in_at) as day_of_week,
            COUNT(*) as activity_count
        FROM venue_live_presence
        WHERE user_id = profile_b_id 
        AND checked_in_at >= NOW() - (time_window_days || ' days')::INTERVAL
        GROUP BY EXTRACT(HOUR FROM checked_in_at), EXTRACT(DOW FROM checked_in_at)
    ),
    time_overlap AS (
        SELECT 
            a.activity_hour,
            a.day_of_week,
            LEAST(a.activity_count, b.activity_count) as overlap_count,
            GREATEST(a.activity_count, b.activity_count) as max_count
        FROM profile_a_activity a
        JOIN profile_b_activity b ON a.activity_hour = b.activity_hour AND a.day_of_week = b.day_of_week
    )
    SELECT 
        COALESCE(AVG(overlap_count::REAL / NULLIF(max_count::REAL, 0)), 0) as calculated_sync_score,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'start_hour', activity_hour,
                    'end_hour', activity_hour + 1,
                    'days_of_week', ARRAY[day_of_week],
                    'strength', overlap_count::REAL / NULLIF(max_count::REAL, 0)
                )
            ) FILTER (WHERE overlap_count > 0), 
            '[]'::JSONB
        ) as calculated_common_windows
    INTO sync_result, common_activity_windows
    FROM time_overlap;

    RETURN QUERY SELECT sync_result, common_activity_windows;
END;
$$;

-- =====================================================
-- 👥 FUNCTION: Get Friend Suggestion Candidates
-- =====================================================
CREATE OR REPLACE FUNCTION get_friend_suggestion_candidates(
    target_profile_id UUID,
    limit_count INTEGER DEFAULT 30
)
RETURNS TABLE (
    profile_id UUID,
    interaction_score INTEGER
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH potential_friends AS (
        -- Profiles who have been in same floqs
        SELECT 
            fp.user_id,
            COUNT(*) * 3 as score
        FROM floq_participants fp
        WHERE fp.floq_id IN (
            SELECT floq_id FROM floq_participants WHERE COALESCE(user_id, profile_id) = target_profile_id
        )
        AND COALESCE(fp.user_id, fp.profile_id) != target_profile_id
        AND COALESCE(fp.user_id, fp.profile_id) NOT IN (
            -- Exclude existing friends
            SELECT CASE 
                WHEN user_a = target_profile_id THEN user_b 
                ELSE user_a 
            END
            FROM friends 
            WHERE (user_a = target_profile_id OR user_b = target_profile_id) 
            AND status = 'accepted'
        )
        GROUP BY COALESCE(fp.user_id, fp.profile_id)
        
        UNION ALL
        
        -- Profiles who have been in same plans
        SELECT 
            COALESCE(pp.user_id, pp.profile_id) as user_id,
            COUNT(*) * 2 as score
        FROM plan_participants pp
        WHERE pp.plan_id IN (
            SELECT plan_id FROM plan_participants WHERE COALESCE(user_id, profile_id) = target_profile_id
        )
        AND COALESCE(pp.user_id, pp.profile_id) != target_profile_id
        AND COALESCE(pp.user_id, pp.profile_id) NOT IN (
            SELECT CASE 
                WHEN user_a = target_profile_id THEN user_b 
                ELSE user_a 
            END
            FROM friends 
            WHERE (user_a = target_profile_id OR user_b = target_profile_id) 
            AND status = 'accepted'
        )
        GROUP BY COALESCE(pp.user_id, pp.profile_id)
        
        UNION ALL
        
        -- Profiles who have been at same venues
        SELECT 
            vs.user_id,
            COUNT(DISTINCT vs.venue_id) as score
        FROM venue_stays vs
        WHERE vs.venue_id IN (
            SELECT DISTINCT venue_id 
            FROM venue_stays 
            WHERE user_id = target_profile_id 
            AND arrived_at >= NOW() - INTERVAL '90 days'
        )
        AND vs.user_id != target_profile_id
        AND vs.arrived_at >= NOW() - INTERVAL '90 days'
        AND vs.user_id NOT IN (
            SELECT CASE 
                WHEN user_a = target_profile_id THEN user_b 
                ELSE user_a 
            END
            FROM friends 
            WHERE (user_a = target_profile_id OR user_b = target_profile_id) 
            AND status = 'accepted'
        )
        GROUP BY vs.user_id
    ),
    aggregated_candidates AS (
        SELECT 
            pf.user_id,
            SUM(pf.score) as total_score
        FROM potential_friends pf
        GROUP BY pf.user_id
        HAVING SUM(pf.score) >= 2 -- Minimum interaction threshold
    )
    SELECT 
        ac.user_id as profile_id,
        ac.total_score::INTEGER as interaction_score
    FROM aggregated_candidates ac
    ORDER BY ac.total_score DESC
    LIMIT limit_count;
END;
$$;

-- =====================================================
-- 🔄 FUNCTION: Update Friendship Analysis
-- =====================================================
CREATE OR REPLACE FUNCTION upsert_friendship_analysis(
    p_profile_a UUID,
    p_profile_b UUID,
    p_overall_score INTEGER,
    p_confidence_level TEXT,
    p_signals_data JSONB,
    p_relationship_type TEXT
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    analysis_id UUID;
    ordered_profile_low UUID;
    ordered_profile_high UUID;
BEGIN
    -- Ensure consistent ordering of profile pairs (profile_low < profile_high)
    IF p_profile_a::TEXT < p_profile_b::TEXT THEN
        ordered_profile_low := p_profile_a;
        ordered_profile_high := p_profile_b;
    ELSE
        ordered_profile_low := p_profile_b;
        ordered_profile_high := p_profile_a;
    END IF;

    INSERT INTO friendship_analysis (
        profile_low, profile_high, overall_score, confidence_level, 
        signals_data, relationship_type, updated_at
    ) VALUES (
        ordered_profile_low, ordered_profile_high, p_overall_score, p_confidence_level,
        p_signals_data, p_relationship_type, NOW()
    )
    ON CONFLICT (profile_low, profile_high) 
    DO UPDATE SET
        overall_score = EXCLUDED.overall_score,
        confidence_level = EXCLUDED.confidence_level,
        signals_data = EXCLUDED.signals_data,
        relationship_type = EXCLUDED.relationship_type,
        updated_at = NOW()
    RETURNING id INTO analysis_id;

    RETURN analysis_id;
END;
$$;

-- =====================================================
-- 🎯 FUNCTION: Create Friend Suggestion
-- =====================================================
CREATE OR REPLACE FUNCTION create_friend_suggestion(
    p_target_profile_id UUID,
    p_suggested_friend_id UUID,
    p_score INTEGER,
    p_confidence_level TEXT,
    p_suggestion_reason TEXT,
    p_signals_summary JSONB
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    suggestion_id UUID;
BEGIN
    INSERT INTO friend_suggestions (
        target_profile_id, suggested_friend_id, score, confidence_level,
        suggestion_reason, signals_summary
    ) VALUES (
        p_target_profile_id, p_suggested_friend_id, p_score, p_confidence_level,
        p_suggestion_reason, p_signals_summary
    )
    ON CONFLICT (target_profile_id, suggested_friend_id) 
    DO UPDATE SET
        score = EXCLUDED.score,
        confidence_level = EXCLUDED.confidence_level,
        suggestion_reason = EXCLUDED.suggestion_reason,
        signals_summary = EXCLUDED.signals_summary,
        status = 'pending',
        created_at = NOW(),
        expires_at = NOW() + INTERVAL '30 days'
    RETURNING id INTO suggestion_id;

    RETURN suggestion_id;
END;
$$;

-- =====================================================
-- 🧹 FUNCTION: Cleanup Expired Suggestions
-- =====================================================
CREATE OR REPLACE FUNCTION cleanup_expired_friend_suggestions()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM friend_suggestions 
    WHERE expires_at < NOW() 
    AND status = 'pending';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT ALL ON friendship_analysis TO authenticated;
GRANT ALL ON friend_suggestions TO authenticated;