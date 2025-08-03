-- Enhanced Location System Database Schema
-- Supports geofencing, multi-signal venue detection, and proximity scoring

-- ============================================================================
-- 1. GEOFENCING PRIVACY ZONES
-- ============================================================================

-- Geofences table for user-defined privacy zones
CREATE TABLE IF NOT EXISTS public.geofences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('circular', 'polygon')),
    privacy_level TEXT NOT NULL CHECK (privacy_level IN ('hide', 'street', 'area')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Circular geofence properties
    center_lat DOUBLE PRECISION,
    center_lng DOUBLE PRECISION,
    radius_meters INTEGER,
    
    -- Polygon geofence properties
    vertices JSONB, -- Array of {lat, lng} objects
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_circular_geofence CHECK (
        type != 'circular' OR (center_lat IS NOT NULL AND center_lng IS NOT NULL AND radius_meters IS NOT NULL)
    ),
    CONSTRAINT valid_polygon_geofence CHECK (
        type != 'polygon' OR vertices IS NOT NULL
    ),
    CONSTRAINT valid_coordinates CHECK (
        center_lat IS NULL OR (center_lat >= -90 AND center_lat <= 90)
    ),
    CONSTRAINT valid_longitude CHECK (
        center_lng IS NULL OR (center_lng >= -180 AND center_lng <= 180)
    ),
    CONSTRAINT valid_radius CHECK (
        radius_meters IS NULL OR (radius_meters > 0 AND radius_meters <= 5000)
    )
);

-- Indexes for geofence queries
CREATE INDEX IF NOT EXISTS idx_geofences_user_id ON public.geofences(user_id);
CREATE INDEX IF NOT EXISTS idx_geofences_active ON public.geofences(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_geofences_location ON public.geofences(center_lat, center_lng) WHERE type = 'circular';

-- RLS policies for geofences
ALTER TABLE public.geofences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own geofences"
ON public.geofences
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 2. VENUE SIGNATURES FOR MULTI-SIGNAL DETECTION
-- ============================================================================

-- Venue signatures table
CREATE TABLE IF NOT EXISTS public.venue_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id TEXT NOT NULL, -- References venues.id
    name TEXT NOT NULL,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    radius_meters INTEGER NOT NULL DEFAULT 100,
    
    -- Signal weights for confidence calculation
    gps_weight DECIMAL(3,2) NOT NULL DEFAULT 0.30,
    wifi_weight DECIMAL(3,2) NOT NULL DEFAULT 0.30,
    bluetooth_weight DECIMAL(3,2) NOT NULL DEFAULT 0.20,
    building_weight DECIMAL(3,2) NOT NULL DEFAULT 0.20,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_weights CHECK (
        gps_weight + wifi_weight + bluetooth_weight + building_weight = 1.00
    ),
    CONSTRAINT valid_radius CHECK (radius_meters > 0 AND radius_meters <= 1000)
);

-- WiFi networks associated with venues
CREATE TABLE IF NOT EXISTS public.venue_wifi_networks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_signature_id UUID NOT NULL REFERENCES public.venue_signatures(id) ON DELETE CASCADE,
    ssid TEXT NOT NULL,
    bssid TEXT, -- MAC address of access point
    signal_strength INTEGER, -- Typical RSSI in dBm
    frequency INTEGER, -- MHz
    capabilities TEXT[], -- Security capabilities
    confidence DECIMAL(3,2) NOT NULL DEFAULT 1.00, -- How reliable this network is for identification
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT valid_rssi CHECK (signal_strength IS NULL OR signal_strength BETWEEN -100 AND 0),
    CONSTRAINT valid_frequency CHECK (frequency IS NULL OR frequency > 0),
    CONSTRAINT valid_confidence CHECK (confidence >= 0 AND confidence <= 1)
);

-- Bluetooth beacons associated with venues
CREATE TABLE IF NOT EXISTS public.venue_bluetooth_beacons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_signature_id UUID NOT NULL REFERENCES public.venue_signatures(id) ON DELETE CASCADE,
    uuid TEXT NOT NULL,
    major INTEGER,
    minor INTEGER,
    typical_rssi INTEGER, -- Typical RSSI in dBm
    tx_power INTEGER, -- Transmit power
    confidence DECIMAL(3,2) NOT NULL DEFAULT 1.00,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT valid_rssi CHECK (typical_rssi IS NULL OR typical_rssi BETWEEN -100 AND 0),
    CONSTRAINT valid_confidence CHECK (confidence >= 0 AND confidence <= 1)
);

-- Building footprints for venues
CREATE TABLE IF NOT EXISTS public.venue_building_footprints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_signature_id UUID NOT NULL REFERENCES public.venue_signatures(id) ON DELETE CASCADE,
    geometry GEOGRAPHY(POLYGON, 4326) NOT NULL,
    height_meters INTEGER,
    floors INTEGER,
    building_type TEXT,
    confidence DECIMAL(3,2) NOT NULL DEFAULT 1.00,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT valid_height CHECK (height_meters IS NULL OR height_meters > 0),
    CONSTRAINT valid_floors CHECK (floors IS NULL OR floors > 0),
    CONSTRAINT valid_confidence CHECK (confidence >= 0 AND confidence <= 1)
);

-- Indexes for venue signature queries
CREATE INDEX IF NOT EXISTS idx_venue_signatures_venue_id ON public.venue_signatures(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_signatures_location ON public.venue_signatures USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_venue_wifi_signature ON public.venue_wifi_networks(venue_signature_id);
CREATE INDEX IF NOT EXISTS idx_venue_wifi_ssid ON public.venue_wifi_networks(ssid);
CREATE INDEX IF NOT EXISTS idx_venue_bluetooth_signature ON public.venue_bluetooth_beacons(venue_signature_id);
CREATE INDEX IF NOT EXISTS idx_venue_bluetooth_uuid ON public.venue_bluetooth_beacons(uuid);
CREATE INDEX IF NOT EXISTS idx_venue_building_signature ON public.venue_building_footprints(venue_signature_id);
CREATE INDEX IF NOT EXISTS idx_venue_building_geometry ON public.venue_building_footprints USING GIST(geometry);

-- RLS policies for venue signatures (read-only for authenticated users)
ALTER TABLE public.venue_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_wifi_networks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_bluetooth_beacons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_building_footprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Venue signatures are readable by authenticated users"
ON public.venue_signatures FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Venue WiFi networks are readable by authenticated users"
ON public.venue_wifi_networks FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Venue Bluetooth beacons are readable by authenticated users"
ON public.venue_bluetooth_beacons FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Venue building footprints are readable by authenticated users"
ON public.venue_building_footprints FOR SELECT
TO authenticated
USING (true);

-- ============================================================================
-- 3. ENHANCED PROXIMITY TRACKING
-- ============================================================================

-- Proximity events table for tracking user interactions
CREATE TABLE IF NOT EXISTS public.proximity_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    target_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('enter', 'exit', 'sustain')),
    distance_meters DECIMAL(8,2) NOT NULL,
    confidence DECIMAL(3,2) NOT NULL,
    duration_ms BIGINT, -- For sustain and exit events
    
    -- Location context
    user_accuracy DECIMAL(8,2) NOT NULL,
    target_accuracy DECIMAL(8,2) NOT NULL,
    reliability TEXT NOT NULL CHECK (reliability IN ('high', 'medium', 'low')),
    
    -- Additional context
    venue_id TEXT, -- If proximity occurred at a venue
    shared_vibe TEXT, -- If users had the same vibe
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT different_users CHECK (user_id != target_user_id),
    CONSTRAINT valid_distance CHECK (distance_meters >= 0),
    CONSTRAINT valid_confidence CHECK (confidence >= 0 AND confidence <= 1),
    CONSTRAINT valid_duration CHECK (duration_ms IS NULL OR duration_ms >= 0),
    CONSTRAINT valid_accuracy CHECK (user_accuracy > 0 AND target_accuracy > 0)
);

-- Proximity statistics for analytics
CREATE TABLE IF NOT EXISTS public.proximity_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Daily aggregates
    date DATE NOT NULL,
    total_proximity_events INTEGER NOT NULL DEFAULT 0,
    unique_proximity_partners INTEGER NOT NULL DEFAULT 0,
    total_sustained_duration_ms BIGINT NOT NULL DEFAULT 0,
    average_proximity_confidence DECIMAL(3,2),
    
    -- Reliability breakdown
    high_reliability_events INTEGER NOT NULL DEFAULT 0,
    medium_reliability_events INTEGER NOT NULL DEFAULT 0,
    low_reliability_events INTEGER NOT NULL DEFAULT 0,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(user_id, date)
);

-- Indexes for proximity queries
CREATE INDEX IF NOT EXISTS idx_proximity_events_user_id ON public.proximity_events(user_id);
CREATE INDEX IF NOT EXISTS idx_proximity_events_target_user_id ON public.proximity_events(target_user_id);
CREATE INDEX IF NOT EXISTS idx_proximity_events_user_pair ON public.proximity_events(user_id, target_user_id);
CREATE INDEX IF NOT EXISTS idx_proximity_events_created_at ON public.proximity_events(created_at);
CREATE INDEX IF NOT EXISTS idx_proximity_events_venue ON public.proximity_events(venue_id) WHERE venue_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_proximity_stats_user_date ON public.proximity_stats(user_id, date);

-- RLS policies for proximity data
ALTER TABLE public.proximity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proximity_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own proximity events"
ON public.proximity_events FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = target_user_id);

CREATE POLICY "System can insert proximity events"
ON public.proximity_events FOR INSERT
WITH CHECK (true); -- Allow system to insert events

CREATE POLICY "Users can view their own proximity stats"
ON public.proximity_stats FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 4. FUNCTIONS FOR ENHANCED LOCATION FEATURES
-- ============================================================================

-- Function to check geofences for a location
CREATE OR REPLACE FUNCTION public.check_user_geofences(
    p_user_id UUID,
    p_lat DOUBLE PRECISION,
    p_lng DOUBLE PRECISION,
    p_accuracy DOUBLE PRECISION DEFAULT 10
)
RETURNS TABLE (
    geofence_id UUID,
    name TEXT,
    privacy_level TEXT,
    distance_to_boundary DOUBLE PRECISION,
    confidence DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    geofence RECORD;
    point_location GEOGRAPHY;
    distance DOUBLE PRECISION;
    conf DOUBLE PRECISION;
BEGIN
    point_location := ST_MakePoint(p_lng, p_lat)::geography;
    
    FOR geofence IN 
        SELECT g.id, g.name, g.privacy_level, g.type, g.center_lat, g.center_lng, g.radius_meters, g.vertices
        FROM public.geofences g
        WHERE g.user_id = p_user_id AND g.is_active = true
    LOOP
        IF geofence.type = 'circular' THEN
            -- Calculate distance to circular boundary
            distance := ST_Distance(
                point_location,
                ST_MakePoint(geofence.center_lng, geofence.center_lat)::geography
            ) - geofence.radius_meters;
            
            -- Calculate confidence based on GPS accuracy
            IF distance <= -p_accuracy THEN
                conf := 1.0; -- Definitely inside
            ELSIF distance >= p_accuracy + 50 THEN
                conf := 0.0; -- Definitely outside
            ELSE
                -- In uncertainty zone
                conf := GREATEST(0, 1 - (distance + p_accuracy) / (p_accuracy + 50 + p_accuracy));
            END IF;
            
            -- Return if confidence is meaningful
            IF conf > 0.1 THEN
                geofence_id := geofence.id;
                name := geofence.name;
                privacy_level := geofence.privacy_level;
                distance_to_boundary := distance;
                confidence := conf;
                RETURN NEXT;
            END IF;
        END IF;
        -- TODO: Add polygon geofence support
    END LOOP;
END;
$$;

-- Function to get venue signatures near a location
CREATE OR REPLACE FUNCTION public.get_nearby_venue_signatures(
    p_lat DOUBLE PRECISION,
    p_lng DOUBLE PRECISION,
    p_radius_meters INTEGER DEFAULT 500
)
RETURNS TABLE (
    venue_signature_id UUID,
    venue_id TEXT,
    name TEXT,
    distance_meters DOUBLE PRECISION,
    gps_weight DECIMAL,
    wifi_weight DECIMAL,
    bluetooth_weight DECIMAL,
    building_weight DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    point_location GEOGRAPHY;
BEGIN
    point_location := ST_MakePoint(p_lng, p_lat)::geography;
    
    RETURN QUERY
    SELECT 
        vs.id,
        vs.venue_id,
        vs.name,
        ST_Distance(vs.location, point_location),
        vs.gps_weight,
        vs.wifi_weight,
        vs.bluetooth_weight,
        vs.building_weight
    FROM public.venue_signatures vs
    WHERE ST_DWithin(vs.location, point_location, p_radius_meters)
    ORDER BY ST_Distance(vs.location, point_location);
END;
$$;

-- Function to record proximity events
CREATE OR REPLACE FUNCTION public.record_proximity_event(
    p_user_id UUID,
    p_target_user_id UUID,
    p_event_type TEXT,
    p_distance_meters DECIMAL,
    p_confidence DECIMAL,
    p_user_accuracy DECIMAL,
    p_target_accuracy DECIMAL,
    p_reliability TEXT,
    p_duration_ms BIGINT DEFAULT NULL,
    p_venue_id TEXT DEFAULT NULL,
    p_shared_vibe TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    event_id UUID;
BEGIN
    INSERT INTO public.proximity_events (
        user_id, target_user_id, event_type, distance_meters, confidence,
        user_accuracy, target_accuracy, reliability, duration_ms,
        venue_id, shared_vibe
    )
    VALUES (
        p_user_id, p_target_user_id, p_event_type, p_distance_meters, p_confidence,
        p_user_accuracy, p_target_accuracy, p_reliability, p_duration_ms,
        p_venue_id, p_shared_vibe
    )
    RETURNING id INTO event_id;
    
    -- Update daily stats
    INSERT INTO public.proximity_stats (user_id, date, total_proximity_events)
    VALUES (p_user_id, CURRENT_DATE, 1)
    ON CONFLICT (user_id, date)
    DO UPDATE SET 
        total_proximity_events = proximity_stats.total_proximity_events + 1,
        updated_at = NOW();
    
    RETURN event_id;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.check_user_geofences TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_nearby_venue_signatures TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_proximity_event TO authenticated;

-- ============================================================================
-- 5. TRIGGERS AND MAINTENANCE
-- ============================================================================

-- Update timestamps trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers
CREATE TRIGGER update_geofences_updated_at
    BEFORE UPDATE ON public.geofences
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_venue_signatures_updated_at
    BEFORE UPDATE ON public.venue_signatures
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_proximity_stats_updated_at
    BEFORE UPDATE ON public.proximity_stats
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Cleanup function for old proximity events
CREATE OR REPLACE FUNCTION public.cleanup_old_proximity_events()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.proximity_events
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.cleanup_old_proximity_events TO authenticated;