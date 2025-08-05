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
  heading: number | null; // degrees from north
  isStationary: boolean;
  isWalking: boolean;
  isDriving: boolean;
  confidence: number; // 0-1 confidence in classification
  lastUpdated: number; // timestamp
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