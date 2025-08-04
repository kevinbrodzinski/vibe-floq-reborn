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
    venue_id TEXT NOT NULL,
    boundary_type TEXT NOT NULL CHECK (boundary_type IN ('building', 'parcel', 'custom')),
    geometry GEOMETRY(POLYGON, 4326) NOT NULL,
    accuracy_meters INTEGER NOT NULL DEFAULT 10,
    source TEXT NOT NULL DEFAULT 'manual',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(venue_id, boundary_type)
);

-- Proximity events table for tracking user interactions
CREATE TABLE IF NOT EXISTS public.proximity_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('enter', 'exit', 'sustain')),
    distance_meters DECIMAL(8,2) NOT NULL,
    confidence DECIMAL(3,2) NOT NULL,
    location_accuracy_meters INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Prevent self-proximity events
    CHECK (profile_id != target_profile_id)
);

-- Proximity statistics for enhanced scoring
CREATE TABLE IF NOT EXISTS public.proximity_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    total_encounters INTEGER NOT NULL DEFAULT 0,
    total_duration_minutes INTEGER NOT NULL DEFAULT 0,
    average_distance_meters DECIMAL(8,2),
    last_encounter TIMESTAMPTZ,
    confidence_score DECIMAL(3,2) NOT NULL DEFAULT 0.50,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(profile_id, target_profile_id),
    -- Prevent self-proximity stats
    CHECK (profile_id != target_profile_id)
);

-- =====================================================================================
-- STEP 2: CREATE INDEXES
-- =====================================================================================

-- Geofences indexes
CREATE INDEX IF NOT EXISTS idx_geofences_profile_id ON public.geofences(profile_id);
CREATE INDEX IF NOT EXISTS idx_geofences_active ON public.geofences(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_geofence_data_geofence_id ON public.geofence_data(geofence_id);

-- Venue signatures indexes (no profile_id references)
CREATE INDEX IF NOT EXISTS idx_venue_signatures_venue_id ON public.venue_signatures(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_signatures_signal_type ON public.venue_signatures(signal_type);
CREATE INDEX IF NOT EXISTS idx_venue_signatures_identifier ON public.venue_signatures(signal_identifier);

-- Venue boundaries indexes (no profile_id references)
CREATE INDEX IF NOT EXISTS idx_venue_boundaries_venue_id ON public.venue_boundaries(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_boundaries_geometry ON public.venue_boundaries USING GIST(geometry);

-- Proximity events indexes
CREATE INDEX IF NOT EXISTS idx_proximity_events_profile_id ON public.proximity_events(profile_id);
CREATE INDEX IF NOT EXISTS idx_proximity_events_target_profile_id ON public.proximity_events(target_profile_id);
CREATE INDEX IF NOT EXISTS idx_proximity_events_created_at ON public.proximity_events(created_at);
CREATE INDEX IF NOT EXISTS idx_proximity_events_type ON public.proximity_events(event_type);

-- Proximity stats indexes
CREATE INDEX IF NOT EXISTS idx_proximity_stats_profile_id ON public.proximity_stats(profile_id);
CREATE INDEX IF NOT EXISTS idx_proximity_stats_target_profile_id ON public.proximity_stats(target_profile_id);
CREATE INDEX IF NOT EXISTS idx_proximity_stats_last_encounter ON public.proximity_stats(last_encounter);

-- =====================================================================================
-- STEP 3: ENABLE ROW LEVEL SECURITY
-- =====================================================================================

ALTER TABLE public.geofences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geofence_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_boundaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proximity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proximity_stats ENABLE ROW LEVEL SECURITY;

-- =====================================================================================
-- STEP 4: CREATE RLS POLICIES (CAREFUL WITH profile_id REFERENCES)
-- =====================================================================================

-- Geofences: Users can manage their own geofences (HAS profile_id column)
CREATE POLICY "Users can manage their own geofences"
ON public.geofences
FOR ALL
USING (auth.uid() = profile_id)
WITH CHECK (auth.uid() = profile_id);

-- Geofence data: Users can manage data for their own geofences (NO profile_id column - use JOIN)
CREATE POLICY "Users can manage their own geofence data"
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

-- Venue signatures: Read-only for all authenticated users (NO profile_id column)
CREATE POLICY "Authenticated users can read venue signatures"
ON public.venue_signatures
FOR SELECT
USING (auth.role() = 'authenticated');

-- Venue boundaries: Read-only for all authenticated users (NO profile_id column)
CREATE POLICY "Authenticated users can read venue boundaries"
ON public.venue_boundaries
FOR SELECT
USING (auth.role() = 'authenticated');

-- Proximity events: Users can read their own events (HAS profile_id columns)
CREATE POLICY "Users can read their own proximity events"
ON public.proximity_events
FOR SELECT
USING (auth.uid() = profile_id OR auth.uid() = target_profile_id);

-- Proximity events: System can insert events
CREATE POLICY "System can insert proximity events"
ON public.proximity_events
FOR INSERT
WITH CHECK (true); -- This will be restricted by application logic

-- Proximity stats: Users can read their own stats (HAS profile_id columns)
CREATE POLICY "Users can read their own proximity stats"
ON public.proximity_stats
FOR SELECT
USING (auth.uid() = profile_id OR auth.uid() = target_profile_id);

-- Proximity stats: System can manage stats
CREATE POLICY "System can manage proximity stats"
ON public.proximity_stats
FOR ALL
WITH CHECK (true); -- This will be restricted by application logic

-- =====================================================================================
-- STEP 5: CREATE UTILITY FUNCTIONS
-- =====================================================================================

-- Function to check if a point is within any active geofence for a user
CREATE OR REPLACE FUNCTION public.check_geofence_privacy(
    user_profile_id UUID,
    check_lat DECIMAL(10,8),
    check_lng DECIMAL(11,8)
)
RETURNS TABLE(
    geofence_id UUID,
    privacy_level TEXT,
    geofence_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        g.id,
        g.privacy_level,
        g.name
    FROM public.geofences g
    JOIN public.geofence_data gd ON g.id = gd.geofence_id
    WHERE g.profile_id = user_profile_id
      AND g.is_active = true
      AND (
          -- Check circular geofences
          (g.type = 'circular' AND 
           ST_DWithin(
               ST_Point(check_lng, check_lat)::geography,
               ST_Point(gd.center_lng, gd.center_lat)::geography,
               gd.radius_meters
           ))
          OR
          -- Check polygon geofences
          (g.type = 'polygon' AND
           ST_Contains(
               ST_GeomFromGeoJSON(gd.polygon_coordinates::text),
               ST_Point(check_lng, check_lat)
           ))
      );
END;
$$;

-- Function to get venue confidence score based on multiple signals
CREATE OR REPLACE FUNCTION public.calculate_venue_confidence(
    venue_id_param TEXT,
    wifi_signals TEXT[] DEFAULT NULL,
    bluetooth_signals TEXT[] DEFAULT NULL
)
RETURNS DECIMAL(3,2)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    total_confidence DECIMAL(5,2) := 0;
    signal_count INTEGER := 0;
    wifi_confidence DECIMAL(3,2) := 0;
    bt_confidence DECIMAL(3,2) := 0;
BEGIN
    -- Calculate WiFi confidence
    IF wifi_signals IS NOT NULL THEN
        SELECT COALESCE(AVG(vs.confidence_score), 0)
        INTO wifi_confidence
        FROM public.venue_signatures vs
        WHERE vs.venue_id = venue_id_param
          AND vs.signal_type = 'wifi'
          AND vs.signal_identifier = ANY(wifi_signals);
        
        IF wifi_confidence > 0 THEN
            total_confidence := total_confidence + wifi_confidence;
            signal_count := signal_count + 1;
        END IF;
    END IF;

    -- Calculate Bluetooth confidence
    IF bluetooth_signals IS NOT NULL THEN
        SELECT COALESCE(AVG(vs.confidence_score), 0)
        INTO bt_confidence
        FROM public.venue_signatures vs
        WHERE vs.venue_id = venue_id_param
          AND vs.signal_type = 'bluetooth'
          AND vs.signal_identifier = ANY(bluetooth_signals);
        
        IF bt_confidence > 0 THEN
            total_confidence := total_confidence + bt_confidence;
            signal_count := signal_count + 1;
        END IF;
    END IF;

    -- Return average confidence or 0 if no signals matched
    IF signal_count > 0 THEN
        RETURN LEAST(total_confidence / signal_count, 1.0);
    ELSE
        RETURN 0.0;
    END IF;
END;
$$;

-- Function to update proximity statistics
CREATE OR REPLACE FUNCTION public.update_proximity_stats(
    user_profile_id UUID,
    target_user_profile_id UUID,
    event_type_param TEXT,
    distance_param DECIMAL(8,2),
    duration_minutes INTEGER DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Insert or update proximity stats
    INSERT INTO public.proximity_stats (
        profile_id,
        target_profile_id,
        total_encounters,
        total_duration_minutes,
        average_distance_meters,
        last_encounter,
        confidence_score,
        updated_at
    )
    VALUES (
        user_profile_id,
        target_user_profile_id,
        CASE WHEN event_type_param = 'enter' THEN 1 ELSE 0 END,
        COALESCE(duration_minutes, 0),
        distance_param,
        NOW(),
        0.50,
        NOW()
    )
    ON CONFLICT (profile_id, target_profile_id)
    DO UPDATE SET
        total_encounters = proximity_stats.total_encounters + 
            CASE WHEN event_type_param = 'enter' THEN 1 ELSE 0 END,
        total_duration_minutes = proximity_stats.total_duration_minutes + 
            COALESCE(duration_minutes, 0),
        average_distance_meters = (
            (proximity_stats.average_distance_meters * proximity_stats.total_encounters + distance_param) /
            (proximity_stats.total_encounters + 1)
        ),
        last_encounter = NOW(),
        confidence_score = LEAST(
            proximity_stats.confidence_score + 0.1,
            1.0
        ),
        updated_at = NOW();
END;
$$;

-- =====================================================================================
-- STEP 6: CREATE TRIGGER FUNCTIONS AND TRIGGERS (LAST)
-- =====================================================================================

-- Trigger function to automatically update proximity stats when events are inserted
CREATE OR REPLACE FUNCTION public.handle_proximity_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Validate that the table has the required columns
    -- This function will only be called on proximity_events which HAS profile_id columns
    
    -- Update stats for both directions of the relationship
    PERFORM public.update_proximity_stats(
        NEW.profile_id,
        NEW.target_profile_id,
        NEW.event_type,
        NEW.distance_meters,
        CASE WHEN NEW.event_type = 'sustain' THEN 1 ELSE NULL END
    );
    
    PERFORM public.update_proximity_stats(
        NEW.target_profile_id,
        NEW.profile_id,
        NEW.event_type,
        NEW.distance_meters,
        CASE WHEN NEW.event_type = 'sustain' THEN 1 ELSE NULL END
    );
    
    RETURN NEW;
END;
$$;

-- Create trigger ONLY on proximity_events table (which HAS profile_id columns)
CREATE TRIGGER trigger_update_proximity_stats
    AFTER INSERT ON public.proximity_events
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_proximity_event();

-- =====================================================================================
-- STEP 7: GRANT PERMISSIONS
-- =====================================================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;