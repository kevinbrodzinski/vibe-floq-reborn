/**
 * Centralized Zustand Location Store - Single source of truth for location state
 * Provides selective subscriptions to prevent unnecessary re-renders
 * Integrates with GlobalLocationManager and LocationBus for coordinated state management
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';
import { useEffect } from 'react';
import { locationBus } from '@/lib/location/LocationBus';

interface Coordinates {
  lat: number;
  lng: number;
  accuracy: number;
}

interface MovementContext {
  speed: number;
  state: 'stationary' | 'walking' | 'driving';
  confidence: number;
}

interface SystemHealth {
  gpsActive: boolean;
  circuitBreakerState: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  errorRate: number;
  lastUpdate: number;
}

interface PerformanceMetrics {
  totalUpdates: number;
  averageLatency: number;
  batchesFlushed: number;
  consumerCount: number;
}

interface LocationState {
  // Core state
  coords: Coordinates | null;
  timestamp: number | null;
  context: MovementContext | null;
  
  // System health
  health: SystemHealth;
  metrics: PerformanceMetrics;
  
  // Actions
  startTracking: () => void;
  stopTracking: () => void;
  updateLocation: (position: GeolocationPosition, context?: MovementContext) => void;
  updateHealth: (health: Partial<SystemHealth>) => void;
  updateMetrics: (metrics: Partial<PerformanceMetrics>) => void;
  reset: () => void;
}

let unsubscribeLocationBus: (() => void) | null = null;

export const useLocationStore = create<LocationState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    coords: null,
    timestamp: null,
    context: null,
    health: {
      gpsActive: false,
      circuitBreakerState: 'CLOSED',
      errorRate: 0,
      lastUpdate: 0
    },
    metrics: {
      totalUpdates: 0,
      averageLatency: 0,
      batchesFlushed: 0,
      consumerCount: 0
    },

    // Actions
    startTracking: () => {
      if (unsubscribeLocationBus) return;

      unsubscribeLocationBus = locationBus.registerConsumer({
        id: 'zustand-store',
        priority: 'high',
        callback: (position: GeolocationPosition) => {
          const debugInfo = locationBus.getDebugInfo();
          
          set((state) => ({
            coords: {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy
            },
            timestamp: position.timestamp,
            context: debugInfo.movementContext,
            health: {
              ...state.health,
              gpsActive: true,
              lastUpdate: Date.now()
            },
            metrics: {
              totalUpdates: debugInfo.metrics.totalUpdates,
              averageLatency: debugInfo.metrics.averageLatency,
              batchesFlushed: debugInfo.metrics.batchesFlushed,
              consumerCount: debugInfo.consumerCount
            }
          }));
        },
        errorCallback: (error: GeolocationPositionError) => {
          set((state) => ({
            health: {
              ...state.health,
              gpsActive: false,
              errorRate: state.health.errorRate + 0.1
            }
          }));
        }
      });

      set((state) => ({
        health: { ...state.health, gpsActive: true }
      }));
    },

    stopTracking: () => {
      if (unsubscribeLocationBus) {
        unsubscribeLocationBus();
        unsubscribeLocationBus = null;
      }

      set((state) => ({
        health: { ...state.health, gpsActive: false }
      }));
    },

    updateLocation: (position: GeolocationPosition, context?: MovementContext) => {
      set({
        coords: {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        },
        timestamp: position.timestamp,
        context: context || null
      });
    },

    updateHealth: (healthUpdate: Partial<SystemHealth>) => {
      set((state) => ({
        health: { ...state.health, ...healthUpdate }
      }));
    },

    updateMetrics: (metricsUpdate: Partial<PerformanceMetrics>) => {
      set((state) => ({
        metrics: { ...state.metrics, ...metricsUpdate }
      }));
    },

    reset: () => {
      if (unsubscribeLocationBus) {
        unsubscribeLocationBus();
        unsubscribeLocationBus = null;
      }
      
      locationBus.reset();
      
      set({
        coords: null,
        timestamp: null,
        context: null,
        health: {
          gpsActive: false,
          circuitBreakerState: 'CLOSED',
          errorRate: 0,
          lastUpdate: 0
        },
        metrics: {
          totalUpdates: 0,
          averageLatency: 0,
          batchesFlushed: 0,
          consumerCount: 0
        }
      });
    }
  }))
);

// Selector hooks for optimized re-renders
export const useLocationCoords = () => useLocationStore((state) => state.coords);
export const useLocationHealth = () => useLocationStore((state) => state.health);
export const useMovementContext = () => useLocationStore((state) => state.context);
export const useLocationMetrics = () => useLocationStore((state) => state.metrics);

/**
 * Subscribe to coordinates only - prevents re-renders on other state changes
 */
export const useLocationCoords = () => 
  useLocationStore((state) => state.coords);

/**
 * Subscribe to coordinates with timestamp
 */
export const useLocationCoordsWithTime = () => 
  useLocationStore((state) => ({ coords: state.coords, timestamp: state.timestamp }));

/**
 * Subscribe to movement context only
 */
export const useMovementContext = () => 
  useLocationStore((state) => state.movementContext);

/**
 * Subscribe to tracking state only
 */
export const useTrackingState = () => 
  useLocationStore((state) => ({ 
    isTracking: state.isTracking, 
    trackingStartTime: state.trackingStartTime 
  }));

/**
 * Subscribe to presence state only
 */
export const usePresenceState = () => 
  useLocationStore((state) => ({ 
    isPresenceEnabled: state.isPresenceEnabled, 
    presenceStartTime: state.presenceStartTime 
  }));

/**
 * Subscribe to system health only
 */
export const useLocationHealth = () => 
  useLocationStore((state) => state.systemHealth);

/**
 * Subscribe to performance metrics only
 */
export const useLocationMetrics = () => 
  useLocationStore((state) => state.metrics);

/**
 * Subscribe to status and error only
 */
export const useLocationStatus = () => 
  useLocationStore((state) => ({ 
    status: state.status, 
    error: state.error, 
    hasPermission: state.hasPermission 
  }));

/**
 * Subscribe to computed selectors
 */
export const useLocationSelectors = () => 
  useLocationStore((state) => ({
    getDistance: state.getDistance,
    isNearby: state.isNearby,
    getMovementStatus: state.getMovementStatus,
    getSystemHealthScore: state.getSystemHealthScore
  }));

/**
 * Subscribe to actions only (stable references)
 */
export const useLocationActions = () => 
  useLocationStore((state) => ({
    updateLocation: state.updateLocation,
    updateMovementContext: state.updateMovementContext,
    setStatus: state.setStatus,
    setPermission: state.setPermission,
    startTracking: state.startTracking,
    stopTracking: state.stopTracking,
    enablePresence: state.enablePresence,
    disablePresence: state.disablePresence,
    updateSystemHealth: state.updateSystemHealth,
    updateMetrics: state.updateMetrics,
    reset: state.reset
  }));

/**
 * Hook to track subscription count for performance monitoring
 */
export const useLocationStoreSubscriptionTracker = () => {
  const updateMetrics = useLocationStore((state) => state.updateMetrics);
  
  useEffect(() => {
    updateMetrics({ subscriptionCount: useLocationStore.getState().metrics.subscriptionCount + 1 });
    
    return () => {
      updateMetrics({ subscriptionCount: Math.max(0, useLocationStore.getState().metrics.subscriptionCount - 1) });
    };
  }, [updateMetrics]);
};

// Development helpers
if (process.env.NODE_ENV === 'development') {
  // Expose store to window for debugging
  (window as any).locationStore = useLocationStore;
  
  // Log state changes in development
  useLocationStore.subscribe(
    (state) => state.coords,
    (coords, prevCoords) => {
      if (coords && (!prevCoords || 
          coords.lat !== prevCoords.lat || 
          coords.lng !== prevCoords.lng)) {
        console.log('[LocationStore] Coordinates updated:', coords);
      }
    }
  );
  
  useLocationStore.subscribe(
    (state) => state.systemHealth,
    (health) => {
      const score = useLocationStore.getState().getSystemHealthScore();
      if (score < 80) {
        console.warn('[LocationStore] System health degraded:', score, health);
      }
    }
  );
}