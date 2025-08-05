/**
 * Centralized Zustand Location Store - Single source of truth for location state
 * Provides selective subscriptions to prevent unnecessary re-renders
 * Integrates with GlobalLocationManager and LocationBus for coordinated state management
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { useMemo } from 'react';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';
import { useEffect } from 'react';

interface LocationCoords {
  lat: number;
  lng: number;
  accuracy: number;
}

interface MovementContext {
  isStationary: boolean;
  isWalking: boolean;
  isDriving: boolean;
  speed: number; // m/s
  heading?: number;
  confidence: number; // 0-1
}

interface SystemHealth {
  gpsManager: {
    isHealthy: boolean;
    subscriberCount: number;
    failureCount: number;
    lastUpdate: number;
  };
  locationBus: {
    isHealthy: boolean;
    consumerCount: number;
    batchSize: number;
    averageLatency: number;
  };
  circuitBreaker: {
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    isHealthy: boolean;
    queueSize: number;
    writeRate: number;
  };
}

interface PerformanceMetrics {
  totalUpdates: number;
  averageAccuracy: number;
  updateFrequency: number; // updates per minute
  lastUpdateTime: number;
  memoryUsage?: number;
  renderCount: number;
  subscriptionCount: number;
}

interface LocationState {
  // Core location data
  coords: LocationCoords | null;
  timestamp: number | null;
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
  hasPermission: boolean;
  
  // Movement context
  movementContext: MovementContext | null;
  
  // Tracking state
  isTracking: boolean;
  trackingStartTime: number | null;
  
  // Presence sharing
  isPresenceEnabled: boolean;
  presenceStartTime: number | null;
  
  // System health
  systemHealth: SystemHealth;
  
  // Performance metrics
  metrics: PerformanceMetrics;
  
  // Actions
  updateLocation: (coords: LocationCoords, timestamp: number) => void;
  updateMovementContext: (context: MovementContext) => void;
  setStatus: (status: 'idle' | 'loading' | 'success' | 'error', error?: string) => void;
  setPermission: (hasPermission: boolean) => void;
  startTracking: () => void;
  stopTracking: () => void;
  enablePresence: () => void;
  disablePresence: () => void;
  updateSystemHealth: (health: Partial<SystemHealth>) => void;
  updateMetrics: (metrics: Partial<PerformanceMetrics>) => void;
  reset: () => void;
  
  // Computed selectors (for performance)
  getDistance: (targetLat: number, targetLng: number) => number | null;
  isNearby: (targetLat: number, targetLng: number, radiusM: number) => boolean;
  getMovementStatus: () => 'stationary' | 'walking' | 'driving' | 'unknown';
  getSystemHealthScore: () => number; // 0-100
}

const initialState = {
  coords: null,
  timestamp: null,
  status: 'idle' as const,
  error: null,
  hasPermission: false,
  movementContext: null,
  isTracking: false,
  trackingStartTime: null,
  isPresenceEnabled: false,
  presenceStartTime: null,
  systemHealth: {
    gpsManager: {
      isHealthy: true,
      subscriberCount: 0,
      failureCount: 0,
      lastUpdate: 0
    },
    locationBus: {
      isHealthy: true,
      consumerCount: 0,
      batchSize: 0,
      averageLatency: 0
    },
    circuitBreaker: {
      state: 'CLOSED' as const,
      isHealthy: true,
      queueSize: 0,
      writeRate: 0
    }
  },
  metrics: {
    totalUpdates: 0,
    averageAccuracy: 0,
    updateFrequency: 0,
    lastUpdateTime: 0,
    renderCount: 0,
    subscriptionCount: 0
  }
};

export const useLocationStore = create<LocationState>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        ...initialState,
        
        updateLocation: (coords: LocationCoords, timestamp: number) => {
          set((state) => {
            const previousCoords = state.coords;
            state.coords = coords;
            state.timestamp = timestamp;
            state.status = 'success';
            state.error = null;
            
            // Update metrics
            state.metrics.totalUpdates++;
            state.metrics.lastUpdateTime = timestamp;
            
            // Calculate running average accuracy
            if (previousCoords) {
              state.metrics.averageAccuracy = 
                (state.metrics.averageAccuracy * (state.metrics.totalUpdates - 1) + coords.accuracy) / 
                state.metrics.totalUpdates;
            } else {
              state.metrics.averageAccuracy = coords.accuracy;
            }
            
            // Calculate update frequency (updates per minute)
            if (state.metrics.totalUpdates > 1) {
              const timeDiff = timestamp - (state.metrics.lastUpdateTime || timestamp);
              const updatesPerMs = 1 / timeDiff;
              state.metrics.updateFrequency = updatesPerMs * 60000; // per minute
            }
          });
        },
        
        updateMovementContext: (context: MovementContext) => {
          set((state) => {
            state.movementContext = context;
          });
        },
        
        setStatus: (status: 'idle' | 'loading' | 'success' | 'error', error?: string) => {
          set((state) => {
            state.status = status;
            state.error = error || null;
          });
        },
        
        setPermission: (hasPermission: boolean) => {
          set((state) => {
            state.hasPermission = hasPermission;
          });
        },
        
        startTracking: () => {
          set((state) => {
            if (!state.isTracking) {
              state.isTracking = true;
              state.trackingStartTime = Date.now();
            }
          });
        },
        
        stopTracking: () => {
          set((state) => {
            state.isTracking = false;
            state.trackingStartTime = null;
          });
        },
        
        enablePresence: () => {
          set((state) => {
            if (!state.isPresenceEnabled) {
              state.isPresenceEnabled = true;
              state.presenceStartTime = Date.now();
            }
          });
        },
        
        disablePresence: () => {
          set((state) => {
            state.isPresenceEnabled = false;
            state.presenceStartTime = null;
          });
        },
        
        updateSystemHealth: (health: Partial<SystemHealth>) => {
          set((state) => {
            if (health.gpsManager) {
              Object.assign(state.systemHealth.gpsManager, health.gpsManager);
            }
            if (health.locationBus) {
              Object.assign(state.systemHealth.locationBus, health.locationBus);
            }
            if (health.circuitBreaker) {
              Object.assign(state.systemHealth.circuitBreaker, health.circuitBreaker);
            }
          });
        },
        
        updateMetrics: (metrics: Partial<PerformanceMetrics>) => {
          set((state) => {
            Object.assign(state.metrics, metrics);
          });
        },
        
        reset: () => {
          set((state) => {
            Object.assign(state, initialState);
          });
        },
        
        // Computed selectors
        getDistance: (targetLat: number, targetLng: number) => {
          const state = get();
          if (!state.coords) return null;
          
          const R = 6371e3; // Earth's radius in meters
          const φ1 = state.coords.lat * Math.PI / 180;
          const φ2 = targetLat * Math.PI / 180;
          const Δφ = (targetLat - state.coords.lat) * Math.PI / 180;
          const Δλ = (targetLng - state.coords.lng) * Math.PI / 180;

          const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                    Math.cos(φ1) * Math.cos(φ2) *
                    Math.sin(Δλ/2) * Math.sin(Δλ/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

          return R * c;
        },
        
        isNearby: (targetLat: number, targetLng: number, radiusM: number) => {
          const distance = get().getDistance(targetLat, targetLng);
          return distance !== null && distance <= radiusM;
        },
        
        getMovementStatus: () => {
          const context = get().movementContext;
          if (!context) return 'unknown';
          
          if (context.isDriving) return 'driving';
          if (context.isWalking) return 'walking';
          if (context.isStationary) return 'stationary';
          return 'unknown';
        },
        
        getSystemHealthScore: () => {
          const health = get().systemHealth;
          let score = 0;
          let components = 0;
          
          // GPS Manager health (33% weight)
          if (health.gpsManager.isHealthy) {
            score += 33;
          }
          components++;
          
          // Location Bus health (33% weight)
          if (health.locationBus.isHealthy) {
            score += 33;
          }
          components++;
          
          // Circuit Breaker health (34% weight)
          if (health.circuitBreaker.isHealthy && health.circuitBreaker.state === 'CLOSED') {
            score += 34;
          }
          components++;
          
          return Math.round(score);
        }
      }))
    ),
    {
      name: 'location-store',
      enabled: process.env.NODE_ENV === 'development'
    }
  )
);

/** ------------------------------------------------------------------
 *  Typed selector helpers – renamed to avoid conflicts
 *  ------------------------------------------------------------------ */
export const useRawLocationCoords = () =>
  useLocationStore((state) => state.coords);

export const useRawMovementContext = () =>
  useLocationStore((state) => state.movementContext);

export const useLocationHealth = () =>
  useLocationStore((state) => state.systemHealth);

export const useRawLocationMetrics = () =>
  useLocationStore((state) => state.metrics);

export const useLocationStatus = () =>
  useLocationStore((state) => state.status);

/**
 * Hook to grab only the store actions (start/stop tracking, etc.).
 * Keeps React components from re-rendering when coords/status change.
 */
export const useLocationActions = () => {
  // Use individual selectors to avoid creating new objects on every render
  const startTracking = useLocationStore((state) => state.startTracking);
  const stopTracking = useLocationStore((state) => state.stopTracking);
  const setStatus = useLocationStore((state) => state.setStatus);
  const setPermission = useLocationStore((state) => state.setPermission);
  const enablePresence = useLocationStore((state) => state.enablePresence);
  const disablePresence = useLocationStore((state) => state.disablePresence);
  const updateLocation = useLocationStore((state) => state.updateLocation);
  const updateMovementContext = useLocationStore((state) => state.updateMovementContext);
  const updateSystemHealth = useLocationStore((state) => state.updateSystemHealth);
  const updateMetrics = useLocationStore((state) => state.updateMetrics);
  const reset = useLocationStore((state) => state.reset);
  
  // Return a stable object that only changes when the actual functions change
  return useMemo(() => ({
    startTracking,
    stopTracking,
    setStatus,
    setPermission,
    enablePresence,
    disablePresence,
    updateLocation,
    updateMovementContext,
    updateSystemHealth,
    updateMetrics,
    reset,
  }), [
    startTracking,
    stopTracking,
    setStatus,
    setPermission,
    enablePresence,
    disablePresence,
    updateLocation,
    updateMovementContext,
    updateSystemHealth,
    updateMetrics,
    reset,
  ]);
};