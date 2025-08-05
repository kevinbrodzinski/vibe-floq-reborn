
export interface LocationPoint {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
}

export interface ProximityAnalysis {
  profile_id: string;
  userId: string; // Keep for backward compatibility
  distance: number;
  timestamp: string;
  location: {
    lat: number;
    lng: number;
  };
  confidence: number;
}

export interface VenueDetectionResult {
  id: string;
  name: string;
  venue_id: string;
  confidence: number;
  location: {
    lat: number;
    lng: number;
  };
  distance: number;
}

export interface ProximityEventRecord {
  id: string;
  profile_id: string;
  event_type: string;
  proximity_data: any;
  created_at: string;
  metadata?: any;
  // Additional properties for compatibility
  timestamp?: string;
  targetProfileId?: string;
  eventType?: string;
  distance?: number;
  confidence?: number;
}

export interface GeofencingService {
  addGeofence: (id: string, lat: number, lng: number, radius: number) => void;
  removeGeofence: (id: string) => void;
  checkLocation: (lat: number, lng: number) => boolean;
}

export interface EnvFactors {
  timeOfDay: string;
  weatherConditions: string;
  crowdDensity: number;
  locationStability?: number; // Add optional locationStability
}

export interface MovementContext {
  speed: number;
  direction: number;
  stability: number;
}
