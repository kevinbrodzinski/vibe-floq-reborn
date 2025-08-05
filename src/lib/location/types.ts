/**
 * Shared types for the Advanced Location Architecture
 * Export these types for downstream packages to prevent reinvention
 */

export interface GeoCoords {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp?: number;
}

export interface MovementContext {
  speed: number; // m/s
  heading: number | null; // degrees from north - now required
  isStationary: boolean;
  isWalking: boolean;
  isDriving: boolean;
  confidence: number; // 0-1 confidence in classification
  lastUpdated: number; // timestamp - now required
}

export interface LocationHealth {
  gpsManager: {
    isActive: boolean;
    subscriberCount: number;
    lastUpdate: number;
    errorCount: number;
  };
  locationBus: {
    consumerCount: number;
    batchSize: number;
    flushRate: number; // writes per minute
    errorRate: number;
  };
  circuitBreaker: {
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    failureCount: number;
    lastFailure: number | null;
    nextRetry: number | null;
  };
  store: {
    hasCoords: boolean;
    isTracking: boolean;
    lastLocationUpdate: number;
  };
}

export interface SystemMetrics {
  totalConsumers: number;
  activeConsumers: number;
  batchSize: number;
  writeRate: number;
  gpsAccuracy: number;
  movementStatus: 'stationary' | 'walking' | 'driving' | 'unknown';
  uptime: number;
  errorCount: number;
}

export interface LocationConsumer {
  id: string;
  type: 'display' | 'tracking' | 'presence';
  priority: 'high' | 'medium' | 'low';
  callback: (coords: GeoCoords) => void;
  errorCallback: (error: Error) => void;
  options: {
    minDistance?: number;
    minTime?: number;
    enableBatching?: boolean;
    enablePresence?: boolean;
    enableTracking?: boolean;
  };
}

export interface LocationPing {
  ts: string;
  lat: number;
  lng: number;
  acc: number;
}

export interface UnifiedLocationOptions {
  enableTracking?: boolean;
  enablePresence?: boolean;
  minDistance?: number;
  minTime?: number;
  hookId?: string;
  priority?: 'high' | 'medium' | 'low';
  autoStart?: boolean;
}

// Additional location-related interfaces
export interface LocationUpdate {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
  profileId?: string; // Changed from userId
}

export interface ProximityUser {
  profileId: string; // Changed from userId
  location: { lat: number; lng: number };
  accuracy: number;
  timestamp: number;
  vibe?: string;
}

export interface ProximityAnalysis {
  profile_id: string;
  distance: number;
  confidence: number; // now required
}

export interface ProximityEvent {
  profileId: string; // Changed from userId
  targetProfileId: string; // Changed from targetUserId
  eventType: 'enter' | 'exit' | 'sustain';
  distance: number;
  confidence: number;
  timestamp: number;
  duration?: number;
}

export interface EnhancedFeedbackData {
  feedbackType: 'contextual' | 'simple' | 'detailed';
  showUncertainty: boolean;
  emphasizePersonalization: boolean;
  suggestExploration: boolean;
  userConsistency?: number;
  learningInsights?: {
    accuracyTrend: number;
    adaptationRate: number;
  };
  adaptiveInterface: {
    feedbackType: 'contextual' | 'simple' | 'detailed';
    showUncertainty: boolean;
    emphasizePersonalization: boolean;
    suggestExploration: boolean;
    userConsistency?: number;
  };
}

export interface SystemHealthMetrics {
  overallHealth: number;
  accuracy: number;
  responseTime: number;
  learningProgress: number;
  detailedMetrics?: any;
}

export interface VenueDetectionResult {
  venueId: string; // Keep venueId as the main property
  name: string; // now required
  confidence: number;
  overallConfidence?: number;
}

export interface UnifiedLocationState {
  coords: GeoCoords | null;
  timestamp: number | null;
  status: 'loading' | 'success' | 'error' | 'idle';
  error: Error | null;
  hasPermission: boolean;
  isTracking: boolean;
  bufferSize: number;
  startTracking: () => void;
  stopTracking: () => void;
  getCurrentLocation: () => Promise<GeoCoords>;
  resetErrors: () => void;
}