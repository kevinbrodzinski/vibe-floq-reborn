-- Continue Phase 4 fixes: Enable RLS on remaining tables and fix function paths
BEGIN;

-- 1. Enable RLS on remaining critical tables that don't have it
DO $$ 
DECLARE 
    rec RECORD;
BEGIN
    -- Get tables without RLS in public schema
    FOR rec IN 
        SELECT t.tablename 
        FROM pg_tables t 
        LEFT JOIN pg_class c ON c.relname = t.tablename 
        WHERE t.schemaname = 'public' 
        AND (c.relrowsecurity IS NULL OR c.relrowsecurity = false)
        AND t.tablename NOT LIKE 'pg_%'
        AND t.tablename NOT IN ('spatial_ref_sys', 'geography_columns', 'geometry_columns')
        LIMIT 10
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', rec.tablename);
        
        -- Add basic read policies for system tables that should be readable
        IF rec.tablename IN ('venues', 'field_tiles', 'field_tiles_v2', 'event_areas') THEN
            EXECUTE format('CREATE POLICY IF NOT EXISTS "%I_public_read" ON public.%I FOR SELECT USING (true)', rec.tablename, rec.tablename);
        END IF;
        
        -- Add user-specific policies for user data tables  
        IF rec.tablename LIKE '%user%' OR rec.tablename LIKE '%profile%' THEN
            EXECUTE format('CREATE POLICY IF NOT EXISTS "%I_own_access" ON public.%I FOR ALL USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid())', rec.tablename, rec.tablename);
        END IF;
    END LOOP;
END $$;

-- 2. Create advanced location tracking tables for dwell detection
CREATE TABLE IF NOT EXISTS public.location_dwell_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id uuid NOT NULL,
    venue_id uuid,
    start_location geometry(POINT, 4326) NOT NULL,
    end_location geometry(POINT, 4326),
    started_at timestamptz NOT NULL DEFAULT now(),
    ended_at timestamptz,
    dwell_duration_seconds integer,
    confidence_score real DEFAULT 0.8,
    detection_method text DEFAULT 'gps',
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.location_dwell_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "location_dwell_sessions_own_access" 
ON public.location_dwell_sessions 
FOR ALL 
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

-- 3. Create geofencing system for momentary flocks
CREATE TABLE IF NOT EXISTS public.momentary_flocks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    center_point geometry(POINT, 4326) NOT NULL,
    radius_meters integer NOT NULL DEFAULT 50,
    participant_count integer DEFAULT 0,
    dominant_vibe text,
    started_at timestamptz NOT NULL DEFAULT now(),
    ended_at timestamptz,
    is_active boolean DEFAULT true,
    geofence_data jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.momentary_flocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "momentary_flocks_public_read" 
ON public.momentary_flocks 
FOR SELECT 
USING (is_active = true);

-- 4. Create flock participation tracking
CREATE TABLE IF NOT EXISTS public.momentary_flock_participants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    flock_id uuid NOT NULL REFERENCES public.momentary_flocks(id) ON DELETE CASCADE,
    profile_id uuid NOT NULL,
    joined_at timestamptz NOT NULL DEFAULT now(),
    left_at timestamptz,
    location_at_join geometry(POINT, 4326),
    vibe_at_join text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.momentary_flock_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "momentary_flock_participants_own_access" 
ON public.momentary_flock_participants 
FOR ALL 
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

-- 5. Create location detection functions for advanced tracking
CREATE OR REPLACE FUNCTION public.detect_venue_dwell(
    p_profile_id uuid,
    p_lat double precision,
    p_lng double precision,
    p_accuracy integer DEFAULT 10
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_point geometry;
    v_nearby_venues record;
    v_current_session record;
    v_result json;
BEGIN
    -- Create point from coordinates
    v_point := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326);
    
    -- Check for nearby venues within accuracy radius
    SELECT v.id, v.name, ST_Distance(ST_Transform(v.geom, 3857), ST_Transform(v_point, 3857)) as distance_m
    INTO v_nearby_venues
    FROM venues v
    WHERE ST_DWithin(ST_Transform(v.geom, 3857), ST_Transform(v_point, 3857), p_accuracy + 20)
    ORDER BY distance_m
    LIMIT 1;
    
    -- Check for active dwell session
    SELECT * INTO v_current_session
    FROM location_dwell_sessions
    WHERE profile_id = p_profile_id
    AND ended_at IS NULL
    ORDER BY started_at DESC
    LIMIT 1;
    
    -- Logic for starting/ending dwell sessions
    IF v_nearby_venues.id IS NOT NULL THEN
        IF v_current_session.id IS NULL THEN
            -- Start new dwell session
            INSERT INTO location_dwell_sessions 
            (profile_id, venue_id, start_location, detection_method, confidence_score)
            VALUES (p_profile_id, v_nearby_venues.id, v_point, 'gps', 
                   CASE WHEN p_accuracy <= 10 THEN 0.9 ELSE 0.7 END);
            
            v_result := json_build_object(
                'action', 'dwell_started',
                'venue_id', v_nearby_venues.id,
                'venue_name', v_nearby_venues.name
            );
        END IF;
    ELSE
        -- End current session if user moved away
        IF v_current_session.id IS NOT NULL THEN
            UPDATE location_dwell_sessions
            SET ended_at = now(),
                end_location = v_point,
                dwell_duration_seconds = EXTRACT(EPOCH FROM (now() - started_at))::integer
            WHERE id = v_current_session.id;
            
            v_result := json_build_object(
                'action', 'dwell_ended',
                'session_id', v_current_session.id,
                'duration_seconds', EXTRACT(EPOCH FROM (now() - v_current_session.started_at))::integer
            );
        END IF;
    END IF;
    
    RETURN COALESCE(v_result, '{"action": "no_change"}'::json);
END;
$$;

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_location_dwell_sessions_profile_active 
ON public.location_dwell_sessions(profile_id, ended_at) 
WHERE ended_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_momentary_flocks_active_location 
ON public.momentary_flocks USING GIST(center_point) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_momentary_flock_participants_active 
ON public.momentary_flock_participants(flock_id, profile_id, is_active);

COMMIT;