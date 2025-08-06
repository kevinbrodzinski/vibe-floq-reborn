-- Friend Detection System Migration
-- 
-- This system analyzes user behavior patterns to automatically identify potential friendships.
-- It works with the existing friendships table structure (user_low/user_high referencing auth.users.id).
-- 
-- Note: profiles.id = auth.users.id (1:1 FK relationship), so these are interchangeable.
-- However, the friendships table uses auth.users.id directly, so we'll maintain that pattern.

-- Create friendship_analysis table to store computed friendship scores
CREATE TABLE IF NOT EXISTS public.friendship_analysis (
    user_low UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_high UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    overall_score DECIMAL(4,3) NOT NULL CHECK (overall_score >= 0 AND overall_score <= 1),
    confidence_level TEXT NOT NULL CHECK (confidence_level IN ('low', 'medium', 'high')),
    signals_data JSONB NOT NULL DEFAULT '{}',
    relationship_type TEXT NOT NULL CHECK (relationship_type IN ('acquaintance', 'friend', 'close_friend', 'best_friend')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Primary key and constraints
    PRIMARY KEY (user_low, user_high),
    CONSTRAINT friendship_analysis_canonical CHECK (user_low < user_high)
);

-- Create friend_suggestions table for storing AI-generated friend suggestions
CREATE TABLE IF NOT EXISTS public.friend_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_profile_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    suggested_profile_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    score DECIMAL(4,3) NOT NULL CHECK (score >= 0 AND score <= 1),
    confidence_level TEXT NOT NULL CHECK (confidence_level IN ('low', 'medium', 'high')),
    suggestion_reason TEXT NOT NULL,
    signals_summary JSONB NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
    
    -- Constraints
    UNIQUE(target_profile_id, suggested_profile_id),
    CHECK (target_profile_id != suggested_profile_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_friendship_analysis_users ON public.friendship_analysis(user_low, user_high);
CREATE INDEX IF NOT EXISTS idx_friendship_analysis_score ON public.friendship_analysis(overall_score DESC) WHERE overall_score >= 0.3;
CREATE INDEX IF NOT EXISTS idx_friend_suggestions_target ON public.friend_suggestions(target_profile_id, status, expires_at);
CREATE INDEX IF NOT EXISTS idx_friend_suggestions_expires ON public.friend_suggestions(expires_at) WHERE status = 'pending';

-- Function 1: Analyze co-location events between two users
CREATE OR REPLACE FUNCTION analyze_co_location_events(
    profile_a_id UUID,
    profile_b_id UUID,
    days_back INTEGER DEFAULT 90,
    min_overlap_minutes INTEGER DEFAULT 15
)
RETURNS TABLE(
    events_count INTEGER,
    total_overlap_minutes INTEGER,
    avg_proximity_score DECIMAL,
    venues_count INTEGER,
    most_recent_event TIMESTAMPTZ
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    WITH profile_a_presence AS (
        SELECT venue_id, arrived_at, departed_at
        FROM venue_live_presence 
        WHERE profile_id = profile_a_id 
        AND arrived_at >= NOW() - (days_back || ' days')::INTERVAL
        AND departed_at IS NOT NULL
    ),
    profile_b_presence AS (
        SELECT venue_id, arrived_at, departed_at
        FROM venue_live_presence 
        WHERE profile_id = profile_b_id 
        AND arrived_at >= NOW() - (days_back || ' days')::INTERVAL
        AND departed_at IS NOT NULL
    ),
    overlapping_events AS (
        SELECT 
            a.venue_id,
            GREATEST(a.arrived_at, b.arrived_at) as overlap_start,
            LEAST(a.departed_at, b.departed_at) as overlap_end,
            EXTRACT(EPOCH FROM (LEAST(a.departed_at, b.departed_at) - GREATEST(a.arrived_at, b.arrived_at))) / 60 as overlap_minutes
        FROM profile_a_presence a
        JOIN profile_b_presence b ON a.venue_id = b.venue_id
        WHERE GREATEST(a.arrived_at, b.arrived_at) < LEAST(a.departed_at, b.departed_at)
        AND EXTRACT(EPOCH FROM (LEAST(a.departed_at, b.departed_at) - GREATEST(a.arrived_at, b.arrived_at))) / 60 >= min_overlap_minutes
    )
    SELECT 
        COUNT(*)::INTEGER as events_count,
        COALESCE(SUM(overlap_minutes)::INTEGER, 0) as total_overlap_minutes,
        COALESCE(AVG(LEAST(overlap_minutes / 60.0, 1.0))::DECIMAL, 0) as avg_proximity_score,
        COUNT(DISTINCT venue_id)::INTEGER as venues_count,
        MAX(overlap_end) as most_recent_event
    FROM overlapping_events;
END;
$$;

-- Function 2: Analyze shared floq participation
CREATE OR REPLACE FUNCTION analyze_shared_floq_participation(
    profile_a_id UUID,
    profile_b_id UUID,
    days_back INTEGER DEFAULT 90
)
RETURNS TABLE(
    shared_floqs_count INTEGER,
    total_overlap_score DECIMAL,
    most_recent_shared TIMESTAMPTZ
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    WITH shared_floqs AS (
        SELECT 
            f.id as floq_id,
            f.created_at,
            1.0 as interaction_score -- Base score, could be enhanced with actual interaction data
        FROM floqs f
        JOIN floq_participants fp_a ON f.id = fp_a.floq_id 
        JOIN floq_participants fp_b ON f.id = fp_b.floq_id
        WHERE COALESCE(fp_a.user_id, fp_a.profile_id) = profile_a_id
        AND COALESCE(fp_b.user_id, fp_b.profile_id) = profile_b_id
        AND f.created_at >= NOW() - (days_back || ' days')::INTERVAL
    )
    SELECT 
        COUNT(*)::INTEGER as shared_floqs_count,
        COALESCE(SUM(interaction_score)::DECIMAL, 0) as total_overlap_score,
        MAX(created_at) as most_recent_shared
    FROM shared_floqs;
END;
$$;

-- Function 3: Analyze shared plan participation  
CREATE OR REPLACE FUNCTION analyze_shared_plan_participation(
    profile_a_id UUID,
    profile_b_id UUID,
    days_back INTEGER DEFAULT 90
)
RETURNS TABLE(
    shared_plans_count INTEGER,
    total_overlap_score DECIMAL,
    most_recent_shared TIMESTAMPTZ
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    WITH shared_plans AS (
        SELECT 
            p.id as plan_id,
            p.created_at,
            1.0 as interaction_score -- Base score, could be enhanced
        FROM plans p
        JOIN plan_participants pp_a ON p.id = pp_a.plan_id
        JOIN plan_participants pp_b ON p.id = pp_b.plan_id  
        WHERE COALESCE(pp_a.user_id, pp_a.profile_id) = profile_a_id
        AND COALESCE(pp_b.user_id, pp_b.profile_id) = profile_b_id
        AND p.created_at >= NOW() - (days_back || ' days')::INTERVAL
    )
    SELECT 
        COUNT(*)::INTEGER as shared_plans_count,
        COALESCE(SUM(interaction_score)::DECIMAL, 0) as total_overlap_score,
        MAX(created_at) as most_recent_shared
    FROM shared_plans;
END;
$$;

-- Function 4: Analyze venue overlap patterns
CREATE OR REPLACE FUNCTION analyze_venue_overlap_patterns(
    profile_a_id UUID,
    profile_b_id UUID,
    days_back INTEGER DEFAULT 90
)
RETURNS TABLE(
    shared_venues_count INTEGER,
    profile_a_visits INTEGER,
    profile_b_visits INTEGER,
    overlap_visits INTEGER,
    jaccard_similarity DECIMAL,
    weighted_overlap_score DECIMAL
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    WITH profile_a_venues AS (
        SELECT venue_id, COUNT(*) as visit_count
        FROM venue_stays 
        WHERE profile_id = profile_a_id 
        AND created_at >= NOW() - (days_back || ' days')::INTERVAL
        GROUP BY venue_id
    ),
    profile_b_venues AS (
        SELECT venue_id, COUNT(*) as visit_count
        FROM venue_stays 
        WHERE profile_id = profile_b_id 
        AND created_at >= NOW() - (days_back || ' days')::INTERVAL
        GROUP BY venue_id
    ),
    venue_analysis AS (
        SELECT 
            COALESCE(a.venue_id, b.venue_id) as venue_id,
            COALESCE(a.visit_count, 0) as profile_a_visits,
            COALESCE(b.visit_count, 0) as profile_b_visits,
            CASE WHEN a.venue_id IS NOT NULL AND b.venue_id IS NOT NULL THEN 1 ELSE 0 END as is_shared
        FROM profile_a_venues a
        FULL OUTER JOIN profile_b_venues b ON a.venue_id = b.venue_id
    )
    SELECT 
        SUM(is_shared)::INTEGER as shared_venues_count,
        SUM(profile_a_visits)::INTEGER as profile_a_visits,
        SUM(profile_b_visits)::INTEGER as profile_b_visits, 
        SUM(LEAST(profile_a_visits, profile_b_visits) * is_shared)::INTEGER as overlap_visits,
        CASE 
            WHEN COUNT(*) > 0 THEN (SUM(is_shared)::DECIMAL / COUNT(*))
            ELSE 0
        END as jaccard_similarity,
        CASE 
            WHEN SUM(profile_a_visits + profile_b_visits) > 0 THEN 
                (SUM(LEAST(profile_a_visits, profile_b_visits) * is_shared)::DECIMAL * 2 / SUM(profile_a_visits + profile_b_visits))
            ELSE 0
        END as weighted_overlap_score
    FROM venue_analysis;
END;
$$;

-- Function 5: Analyze time synchronization patterns
CREATE OR REPLACE FUNCTION analyze_time_sync_patterns(
    profile_a_id UUID,
    profile_b_id UUID,
    days_back INTEGER DEFAULT 30
)
RETURNS TABLE(
    sync_score DECIMAL,
    peak_sync_hours INTEGER[],
    sync_consistency DECIMAL
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    WITH profile_a_activity AS (
        SELECT 
            DATE_TRUNC('hour', arrived_at) as activity_hour,
            COUNT(*) as activity_count
        FROM venue_live_presence
        WHERE profile_id = profile_a_id 
        AND arrived_at >= NOW() - (days_back || ' days')::INTERVAL
        GROUP BY DATE_TRUNC('hour', arrived_at)
    ),
    profile_b_activity AS (
        SELECT 
            DATE_TRUNC('hour', arrived_at) as activity_hour,
            COUNT(*) as activity_count
        FROM venue_live_presence
        WHERE profile_id = profile_b_id 
        AND arrived_at >= NOW() - (days_back || ' days')::INTERVAL
        GROUP BY DATE_TRUNC('hour', arrived_at)
    ),
    sync_analysis AS (
        SELECT 
            EXTRACT(HOUR FROM COALESCE(a.activity_hour, b.activity_hour)) as hour_of_day,
            COALESCE(a.activity_count, 0) as a_count,
            COALESCE(b.activity_count, 0) as b_count,
            CASE 
                WHEN a.activity_hour IS NOT NULL AND b.activity_hour IS NOT NULL 
                THEN LEAST(a.activity_count, b.activity_count)::DECIMAL / GREATEST(a.activity_count, b.activity_count)
                ELSE 0 
            END as hour_sync_score
        FROM profile_a_activity a
        FULL OUTER JOIN profile_b_activity b ON a.activity_hour = b.activity_hour
    )
    SELECT 
        COALESCE(AVG(hour_sync_score), 0)::DECIMAL as sync_score,
        ARRAY_AGG(hour_of_day::INTEGER ORDER BY hour_sync_score DESC LIMIT 3) as peak_sync_hours,
        CASE 
            WHEN COUNT(*) > 0 THEN (1.0 - STDDEV(hour_sync_score) / NULLIF(AVG(hour_sync_score), 0))::DECIMAL
            ELSE 0
        END as sync_consistency
    FROM sync_analysis
    WHERE hour_sync_score > 0;
END;
$$;

-- Function 6: Get friend suggestion candidates for a user
CREATE OR REPLACE FUNCTION get_friend_suggestion_candidates(
    target_profile_id UUID,
    limit_count INTEGER DEFAULT 20,
    min_interactions INTEGER DEFAULT 2
)
RETURNS TABLE(
    profile_id UUID,
    interaction_count INTEGER,
    last_interaction TIMESTAMPTZ
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    WITH potential_friends AS (
        -- From floq participants
        SELECT 
            COALESCE(fp.user_id, fp.profile_id) as candidate_id,
            COUNT(*) as floq_interactions,
            MAX(f.created_at) as last_floq_interaction
        FROM floqs f
        JOIN floq_participants fp_target ON f.id = fp_target.floq_id
        JOIN floq_participants fp ON f.id = fp.floq_id
        WHERE COALESCE(fp_target.user_id, fp_target.profile_id) = target_profile_id
        AND COALESCE(fp.user_id, fp.profile_id) != target_profile_id
        AND COALESCE(fp.user_id, fp.profile_id) IS NOT NULL
        GROUP BY COALESCE(fp.user_id, fp.profile_id)
        
        UNION ALL
        
        -- From plan participants  
        SELECT 
            COALESCE(pp.user_id, pp.profile_id) as candidate_id,
            COUNT(*) as plan_interactions,
            MAX(p.created_at) as last_plan_interaction
        FROM plans p
        JOIN plan_participants pp_target ON p.id = pp_target.plan_id
        JOIN plan_participants pp ON p.id = pp.plan_id
        WHERE COALESCE(pp_target.user_id, pp_target.profile_id) = target_profile_id
        AND COALESCE(pp.user_id, pp.profile_id) != target_profile_id
        AND COALESCE(pp.user_id, pp.profile_id) IS NOT NULL
        GROUP BY COALESCE(pp.user_id, pp.profile_id)
    ),
    aggregated_candidates AS (
        SELECT 
            candidate_id,
            SUM(floq_interactions) as total_interactions,
            MAX(last_floq_interaction) as last_interaction
        FROM potential_friends
        WHERE candidate_id IS NOT NULL
        GROUP BY candidate_id
        HAVING SUM(floq_interactions) >= min_interactions
    )
    SELECT 
        ac.candidate_id as profile_id,
        ac.total_interactions::INTEGER as interaction_count,
        ac.last_interaction
    FROM aggregated_candidates ac
    -- Exclude existing friends
    WHERE NOT EXISTS (
        SELECT 1 FROM friendships fs 
        WHERE ((fs.user_low = target_profile_id AND fs.user_high = ac.candidate_id)
            OR (fs.user_high = target_profile_id AND fs.user_low = ac.candidate_id))
        AND fs.friend_state = 'accepted'
    )
    -- Exclude pending suggestions
    AND NOT EXISTS (
        SELECT 1 FROM friend_suggestions fsug
        WHERE fsug.target_profile_id = target_profile_id 
        AND fsug.suggested_profile_id = ac.candidate_id
        AND fsug.status = 'pending'
        AND fsug.expires_at > NOW()
    )
    ORDER BY ac.total_interactions DESC, ac.last_interaction DESC
    LIMIT limit_count;
END;
$$;

-- Function 7: Upsert friendship analysis
CREATE OR REPLACE FUNCTION upsert_friendship_analysis(
    p_profile_a UUID,
    p_profile_b UUID,
    p_overall_score DECIMAL,
    p_confidence_level TEXT,
    p_signals_data JSONB,
    p_relationship_type TEXT
)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
    ordered_profile_low UUID;
    ordered_profile_high UUID;
BEGIN
    -- Ensure canonical ordering (lower UUID first)
    IF p_profile_a < p_profile_b THEN
        ordered_profile_low := p_profile_a;
        ordered_profile_high := p_profile_b;
    ELSE
        ordered_profile_low := p_profile_b;
        ordered_profile_high := p_profile_a;
    END IF;
    
    INSERT INTO friendship_analysis (
        user_low, user_high, overall_score, confidence_level, 
        signals_data, relationship_type, updated_at
    ) VALUES (
        ordered_profile_low, ordered_profile_high, p_overall_score, p_confidence_level,
        p_signals_data, p_relationship_type, NOW()
    )
    ON CONFLICT (user_low, user_high) 
    DO UPDATE SET
        overall_score = EXCLUDED.overall_score,
        confidence_level = EXCLUDED.confidence_level,
        signals_data = EXCLUDED.signals_data,
        relationship_type = EXCLUDED.relationship_type,
        updated_at = NOW();
END;
$$;

-- Function 8: Create friend suggestion
CREATE OR REPLACE FUNCTION create_friend_suggestion(
    p_target_profile_id UUID,
    p_suggested_profile_id UUID,
    p_score DECIMAL,
    p_confidence_level TEXT,
    p_suggestion_reason TEXT,
    p_signals_summary JSONB
)
RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
    suggestion_id UUID;
BEGIN
    INSERT INTO friend_suggestions (
        target_profile_id, suggested_profile_id, score, confidence_level,
        suggestion_reason, signals_summary
    ) VALUES (
        p_target_profile_id, p_suggested_profile_id, p_score, p_confidence_level,
        p_suggestion_reason, p_signals_summary
    )
    ON CONFLICT (target_profile_id, suggested_profile_id)
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

-- Function 9: Cleanup expired friend suggestions
CREATE OR REPLACE FUNCTION cleanup_expired_friend_suggestions()
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    UPDATE friend_suggestions 
    SET status = 'expired'
    WHERE status = 'pending' 
    AND expires_at <= NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT ALL ON TABLE public.friendship_analysis TO authenticated;
GRANT ALL ON TABLE public.friend_suggestions TO authenticated;

-- Add RLS policies
ALTER TABLE public.friendship_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS for friendship_analysis: users can see analyses involving them
CREATE POLICY "Users can view their friendship analyses" ON public.friendship_analysis
    FOR SELECT USING (auth.uid() = user_low OR auth.uid() = user_high);

CREATE POLICY "Users can insert their friendship analyses" ON public.friendship_analysis  
    FOR INSERT WITH CHECK (auth.uid() = user_low OR auth.uid() = user_high);

CREATE POLICY "Users can update their friendship analyses" ON public.friendship_analysis
    FOR UPDATE USING (auth.uid() = user_low OR auth.uid() = user_high);

-- RLS for friend_suggestions: users can see suggestions for them
CREATE POLICY "Users can view their friend suggestions" ON public.friend_suggestions
    FOR SELECT USING (auth.uid() = target_profile_id);

CREATE POLICY "Users can update their friend suggestions" ON public.friend_suggestions
    FOR UPDATE USING (auth.uid() = target_profile_id);

CREATE POLICY "System can insert friend suggestions" ON public.friend_suggestions
    FOR INSERT WITH CHECK (true); -- Allow system to create suggestions