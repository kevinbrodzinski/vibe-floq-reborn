-- Enhanced Location System Database Schema - FIXED VERSION
-- Migration: Enhanced location features with geofencing, multi-signal venue detection, and proximity scoring
-- Dependencies: Requires public.profiles table to exist

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- =====================================================================================
-- STEP 1: CREATE ALL TABLES FIRST (no triggers, policies, or functions yet)
-- =====================================================================================

-- Geofences table for user-defined privacy zones
CREATE TABLE IF NOT EXISTS public.geofences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('circular', 'polygon')),
    privacy_level TEXT NOT NULL CHECK (privacy_level IN ('hide', 'street', 'area')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Geofence data table for storing coordinates
CREATE TABLE IF NOT EXISTS public.geofence_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    geofence_id UUID NOT NULL REFERENCES public.geofences(id) ON DELETE CASCADE,
    -- For circular geofences
    center_lat DECIMAL(10,8),
    center_lng DECIMAL(11,8),
    radius_meters INTEGER,
    -- For polygon geofences
    polygon_coordinates JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Venue signatures table for multi-signal venue detection (NO profile_id column)
CREATE TABLE IF NOT EXISTS public.venue_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id TEXT NOT NULL, -- Reference to venues table
    signal_type TEXT NOT NULL CHECK (signal_type IN ('wifi', 'bluetooth', 'nfc')),
    signal_identifier TEXT NOT NULL, -- SSID, MAC address, etc.
    signal_strength INTEGER, -- For proximity estimation
    confidence_score DECIMAL(3,2) NOT NULL DEFAULT 0.50,
    last_verified TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(venue_id, signal_type, signal_identifier)
);

-- Venue boundaries table for intelligent boundary detection (NO profile_id column)
CREATE TABLE IF NOT EXISTS public.venue_boundaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id TEXT NOT NULL, -- Reference to venues table
    boundary_type TEXT NOT NULL CHECK (boundary_type IN ('building', 'property', 'custom')),
    boundary_geom GEOMETRY(POLYGON, 4326) NOT NULL,
    confidence_score DECIMAL(3,2) NOT NULL DEFAULT 0.50,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(venue_id, boundary_type)
);

-- Proximity events table for tracking user interactions (using existing schema)
-- Note: This table already exists with profile_id_a and profile_id_b columns
-- We'll add missing columns if they don't exist
DO $$
BEGIN
    -- Add event_type column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'proximity_events' AND column_name = 'event_type') THEN
        ALTER TABLE public.proximity_events ADD COLUMN event_type TEXT CHECK (event_type IN ('enter', 'exit', 'sustain'));
    END IF;
    
    -- Add distance_meters column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'proximity_events' AND column_name = 'distance_meters') THEN
        ALTER TABLE public.proximity_events ADD COLUMN distance_meters DECIMAL(8,2);
    END IF;
    
    -- Add confidence column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'proximity_events' AND column_name = 'confidence') THEN
        ALTER TABLE public.proximity_events ADD COLUMN confidence DECIMAL(3,2);
    END IF;
    
    -- Add location_accuracy_meters column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'proximity_events' AND column_name = 'location_accuracy_meters') THEN
        ALTER TABLE public.proximity_events ADD COLUMN location_accuracy_meters INTEGER;
    END IF;
    
    -- Add venue_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'proximity_events' AND column_name = 'venue_id') THEN
        ALTER TABLE public.proximity_events ADD COLUMN venue_id TEXT;
    END IF;
END $$;

-- Proximity statistics for enhanced scoring (using existing schema column names)
CREATE TABLE IF NOT EXISTS public.proximity_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id_a UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    profile_id_b UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    total_encounters INTEGER NOT NULL DEFAULT 0,
    total_duration_minutes INTEGER NOT NULL DEFAULT 0,
    average_distance_meters DECIMAL(8,2),
    last_encounter TIMESTAMPTZ,
    confidence_score DECIMAL(3,2) NOT NULL DEFAULT 0.50,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(profile_id_a, profile_id_b),
    -- Prevent self-proximity stats
    CHECK (profile_id_a != profile_id_b)
);

-- =====================================================================================
-- STEP 2: CREATE INDEXES
-- =====================================================================================

-- Geofences indexes
CREATE INDEX IF NOT EXISTS idx_geofences_profile_id ON public.geofences(profile_id);
CREATE INDEX IF NOT EXISTS idx_geofences_active ON public.geofences(is_active) WHERE is_active = true;

-- Geofence data indexes
CREATE INDEX IF NOT EXISTS idx_geofence_data_geofence_id ON public.geofence_data(geofence_id);
CREATE INDEX IF NOT EXISTS idx_geofence_data_location ON public.geofence_data(center_lat, center_lng) WHERE center_lat IS NOT NULL;

-- Venue signatures indexes
CREATE INDEX IF NOT EXISTS idx_venue_signatures_venue_id ON public.venue_signatures(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_signatures_signal_type ON public.venue_signatures(signal_type);

-- Venue boundaries indexes
CREATE INDEX IF NOT EXISTS idx_venue_boundaries_venue_id ON public.venue_boundaries(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_boundaries_geom ON public.venue_boundaries USING GIST(boundary_geom);

-- Proximity events indexes (using existing column names)
CREATE INDEX IF NOT EXISTS idx_proximity_events_profile_id_a ON public.proximity_events(profile_id_a);
CREATE INDEX IF NOT EXISTS idx_proximity_events_profile_id_b ON public.proximity_events(profile_id_b);
CREATE INDEX IF NOT EXISTS idx_proximity_events_event_ts ON public.proximity_events(event_ts);
CREATE INDEX IF NOT EXISTS idx_proximity_events_event_type ON public.proximity_events(event_type) WHERE event_type IS NOT NULL;

-- Proximity stats indexes (using existing schema column names)
CREATE INDEX IF NOT EXISTS idx_proximity_stats_profile_id_a ON public.proximity_stats(profile_id_a);
CREATE INDEX IF NOT EXISTS idx_proximity_stats_profile_id_b ON public.proximity_stats(profile_id_b);
CREATE INDEX IF NOT EXISTS idx_proximity_stats_last_encounter ON public.proximity_stats(last_encounter);

-- =====================================================================================
-- STEP 3: ENABLE ROW LEVEL SECURITY
-- =====================================================================================

-- Enable RLS on all tables
ALTER TABLE public.geofences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geofence_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_boundaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proximity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proximity_stats ENABLE ROW LEVEL SECURITY;

-- =====================================================================================
-- STEP 4: CREATE RLS POLICIES
-- =====================================================================================

-- Geofences policies (HAS profile_id column)
CREATE POLICY "geofences_own_data"
ON public.geofences
FOR ALL
USING (auth.uid() = profile_id)
WITH CHECK (auth.uid() = profile_id);

-- Geofence data policies (NO profile_id - use JOIN to geofences)
CREATE POLICY "geofence_data_own_data"
ON public.geofence_data
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.geofences g 
        WHERE g.id = geofence_data.geofence_id 
        AND g.profile_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.geofences g 
        WHERE g.id = geofence_data.geofence_id 
        AND g.profile_id = auth.uid()
    )
);

-- Venue signatures policies (NO profile_id - authenticated users can read)
CREATE POLICY "venue_signatures_read_all"
ON public.venue_signatures
FOR SELECT
USING (auth.role() = 'authenticated');

-- Venue boundaries policies (NO profile_id - authenticated users can read)
CREATE POLICY "venue_boundaries_read_all"
ON public.venue_boundaries
FOR SELECT
USING (auth.role() = 'authenticated');

-- Proximity events policies (HAS profile_id_a and profile_id_b columns)
CREATE POLICY "proximity_events_own_data"
ON public.proximity_events
FOR SELECT
USING (auth.uid() = profile_id_a OR auth.uid() = profile_id_b);

CREATE POLICY "proximity_events_insert_own"
ON public.proximity_events
FOR INSERT
WITH CHECK (auth.uid() = profile_id_a OR auth.uid() = profile_id_b);

-- Proximity stats policies (HAS profile_id_a and profile_id_b columns)
CREATE POLICY "proximity_stats_own_data"
ON public.proximity_stats
FOR ALL
USING (auth.uid() = profile_id_a OR auth.uid() = profile_id_b)
WITH CHECK (auth.uid() = profile_id_a OR auth.uid() = profile_id_b);

-- =====================================================================================
-- STEP 5: UTILITY FUNCTIONS
-- =====================================================================================

-- Function to check if a point is within a geofence
CREATE OR REPLACE FUNCTION public.is_point_in_geofence(
    geofence_id UUID,
    lat DECIMAL(10,8),
    lng DECIMAL(11,8)
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    geofence_record RECORD;
    point_geom GEOMETRY;
    polygon_geom GEOMETRY;
    distance_meters DECIMAL;
BEGIN
    -- Get geofence details
    SELECT g.type, gd.center_lat, gd.center_lng, gd.radius_meters, gd.polygon_coordinates
    INTO geofence_record
    FROM public.geofences g
    JOIN public.geofence_data gd ON g.id = gd.geofence_id
    WHERE g.id = is_point_in_geofence.geofence_id
    AND g.is_active = true;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    point_geom := ST_SetSRID(ST_MakePoint(lng, lat), 4326);
    
    IF geofence_record.type = 'circular' THEN
        -- Calculate distance using PostGIS
        distance_meters := ST_Distance(
            ST_Transform(point_geom, 3857),
            ST_Transform(ST_SetSRID(ST_MakePoint(geofence_record.center_lng, geofence_record.center_lat), 4326), 3857)
        );
        RETURN distance_meters <= geofence_record.radius_meters;
    ELSIF geofence_record.type = 'polygon' THEN
        -- Create polygon from coordinates
        polygon_geom := ST_GeomFromGeoJSON(geofence_record.polygon_coordinates::text);
        RETURN ST_Within(point_geom, polygon_geom);
    END IF;
    
    RETURN false;
END;
$$;

-- Function to get active geofences for a user
CREATE OR REPLACE FUNCTION public.get_user_geofences(user_profile_id UUID)
RETURNS TABLE(
    id UUID,
    name TEXT,
    type TEXT,
    privacy_level TEXT,
    center_lat DECIMAL(10,8),
    center_lng DECIMAL(11,8),
    radius_meters INTEGER,
    polygon_coordinates JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        g.id,
        g.name,
        g.type,
        g.privacy_level,
        gd.center_lat,
        gd.center_lng,
        gd.radius_meters,
        gd.polygon_coordinates
    FROM public.geofences g
    JOIN public.geofence_data gd ON g.id = gd.geofence_id
    WHERE g.profile_id = user_profile_id
    AND g.is_active = true
    ORDER BY g.created_at DESC;
END;
$$;

-- Function to update proximity statistics (using existing schema column names)
CREATE OR REPLACE FUNCTION public.update_proximity_stats(
    p_profile_id_a UUID,
    p_profile_id_b UUID,
    p_distance_meters DECIMAL(8,2),
    p_duration_minutes INTEGER DEFAULT 1,
    p_confidence DECIMAL(3,2) DEFAULT 0.75
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Ensure canonical ordering (smaller UUID first)
    IF p_profile_id_a > p_profile_id_b THEN
        -- Swap the parameters
        SELECT p_profile_id_b, p_profile_id_a INTO p_profile_id_a, p_profile_id_b;
    END IF;
    
    INSERT INTO public.proximity_stats (
        profile_id_a,
        profile_id_b,
        total_encounters,
        total_duration_minutes,
        average_distance_meters,
        last_encounter,
        confidence_score,
        updated_at
    )
    VALUES (
        p_profile_id_a,
        p_profile_id_b,
        1,
        p_duration_minutes,
        p_distance_meters,
        NOW(),
        p_confidence,
        NOW()
    )
    ON CONFLICT (profile_id_a, profile_id_b)
    DO UPDATE SET
        total_encounters = proximity_stats.total_encounters + 1,
        total_duration_minutes = proximity_stats.total_duration_minutes + p_duration_minutes,
        average_distance_meters = (
            (proximity_stats.average_distance_meters * proximity_stats.total_encounters + p_distance_meters) 
            / (proximity_stats.total_encounters + 1)
        ),
        last_encounter = NOW(),
        confidence_score = GREATEST(proximity_stats.confidence_score, p_confidence),
        updated_at = NOW();
END;
$$;

-- =====================================================================================
-- STEP 6: TRIGGER FUNCTIONS AND TRIGGERS
-- =====================================================================================

-- Function to handle proximity event processing (using existing schema column names)
CREATE OR REPLACE FUNCTION public.handle_proximity_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Update proximity statistics when a new proximity event is inserted
    -- This function will only be called on proximity_events which HAS profile_id_a/profile_id_b columns
    PERFORM public.update_proximity_stats(
        NEW.profile_id_a,
        NEW.profile_id_b,
        COALESCE(NEW.distance_meters, 10.0),
        1, -- Duration in minutes
        COALESCE(NEW.confidence, 0.75)
    );
    
    RETURN NEW;
END;
$$;

-- Create trigger ONLY on proximity_events table (which HAS profile_id_a/profile_id_b columns)
DROP TRIGGER IF EXISTS trigger_handle_proximity_event ON public.proximity_events;
CREATE TRIGGER trigger_handle_proximity_event
AFTER INSERT ON public.proximity_events
FOR EACH ROW
EXECUTE FUNCTION public.handle_proximity_event();

-- =====================================================================================
-- STEP 7: GRANT PERMISSIONS
-- =====================================================================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.geofences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.geofence_data TO authenticated;
GRANT SELECT ON public.venue_signatures TO authenticated;
GRANT SELECT ON public.venue_boundaries TO authenticated;
GRANT SELECT, INSERT ON public.proximity_events TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.proximity_stats TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.is_point_in_geofence(UUID, DECIMAL, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_geofences(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_proximity_stats(UUID, UUID, DECIMAL, INTEGER, DECIMAL) TO authenticated;