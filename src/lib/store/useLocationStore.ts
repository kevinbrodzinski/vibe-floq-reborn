/**
 * Central Location State Management - Single source of truth for all location data
 * Implements Zustand store pattern for coordinated location state across components
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { locationBus } from '@/lib/location/LocationBus';

interface LocationCoords {
  lat: number;
  lng: number;
  accuracy: number;
  heading?: number;
  speed?: number;
}

interface MovementContext {
  isStationary: boolean;
  isWalking: boolean;
  isDriving: boolean;
  speed: number;
  heading?: number;
  lastMovementTime: number;
}

interface LocationHealth {
  gpsActive: boolean;
  lastUpdate: number;
  accuracy: number;
  failureCount: number;
  isHealthy: boolean;
}

interface LocationState {
  // Core location data
  coords: LocationCoords | null;
  timestamp: number | null;
  
  // Movement context
  context: MovementContext | null;
  
  // System health
  health: LocationHealth;
  
  // Permissions & status
  hasPermission: boolean;
  isTracking: boolean;
  error: string | null;
  
  // Performance metrics
  metrics: {
    totalConsumers: number;
    activeConsumers: number;
    writeRate: number;
    batchSize: number;
  };
  
  // Actions
  startTracking: () => void;
  stopTracking: () => void;
  updateLocation: (position: GeolocationPosition, context?: MovementContext) => void;
  updateHealth: (health: Partial<LocationHealth>) => void;
  updateMetrics: (metrics: Partial<LocationState['metrics']>) => void;
  setError: (error: string | null) => void;
  reset: () => void;
  
  // Selectors (computed values)
  getDistanceFrom: (targetLat: number, targetLng: number) => number | null;
  isNearby: (targetLat: number, targetLng: number, radiusMeters: number) => boolean;
  getMovementStatus: () => 'stationary' | 'walking' | 'driving' | 'unknown';
  getLocationAge: () => number; // milliseconds since last update
}

// Helper function to calculate distance
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
};

export const useLocationStore = create<LocationState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    coords: null,
    timestamp: null,
    context: null,
    health: {
      gpsActive: false,
      lastUpdate: 0,
      accuracy: 0,
      failureCount: 0,
      isHealthy: false
    },
    hasPermission: false,
    isTracking: false,
    error: null,
    metrics: {
      totalConsumers: 0,
      activeConsumers: 0,
      writeRate: 0,
      batchSize: 0
    },

    // Actions
    startTracking: () => {
      const state = get();
      if (state.isTracking) return;

      console.log('[LocationStore] Starting location tracking');
      
      // Register with location bus
      const unsubscribe = locationBus.registerConsumer({
        id: 'location-store',
        type: 'analytics',
        priority: 'high',
        callback: (position) => {
          state.updateLocation(position);
        },
        options: {
          minDistance: 1, // Accept all updates for store
          minTime: 1000   // Minimum 1 second between updates
        }
      });

      set({ 
        isTracking: true, 
        error: null,
        health: { ...state.health, gpsActive: true }
      });

      // Store unsubscribe function for cleanup
      (window as any).__locationStoreUnsubscribe = unsubscribe;
    },

    stopTracking: () => {
      console.log('[LocationStore] Stopping location tracking');
      
      // Cleanup subscription
      const unsubscribe = (window as any).__locationStoreUnsubscribe;
      if (unsubscribe) {
        unsubscribe();
        delete (window as any).__locationStoreUnsubscribe;
      }

      set({ 
        isTracking: false,
        health: { ...get().health, gpsActive: false }
      });
    },

    updateLocation: (position: GeolocationPosition, context?: MovementContext) => {
      const now = Date.now();
      const coords: LocationCoords = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        heading: position.coords.heading || undefined,
        speed: position.coords.speed || undefined
      };

      // Detect movement context if not provided
      const currentContext = context || get().context;
      let detectedContext: MovementContext | null = null;
      
      if (currentContext && coords.speed !== undefined) {
        const speed = coords.speed; // m/s
        detectedContext = {
          isStationary: speed < 0.5,
          isWalking: speed >= 0.5 && speed < 2.5,
          isDriving: speed >= 2.5,
          speed,
          heading: coords.heading,
          lastMovementTime: speed > 0.5 ? now : currentContext.lastMovementTime
        };
      }

      // Update health metrics
      const health: LocationHealth = {
        gpsActive: true,
        lastUpdate: now,
        accuracy: coords.accuracy,
        failureCount: 0, // Reset on successful update
        isHealthy: coords.accuracy < 100 // Consider healthy if accuracy < 100m
      };

      set({
        coords,
        timestamp: position.timestamp,
        context: detectedContext,
        health,
        hasPermission: true,
        error: null
      });

      // Update metrics from location bus
      const busMetrics = locationBus.getPerformanceMetrics();
      get().updateMetrics({
        totalConsumers: busMetrics.totalConsumers,
        activeConsumers: busMetrics.activeConsumers,
        writeRate: busMetrics.writeRate,
        batchSize: busMetrics.batchSize
      });
    },

    updateHealth: (healthUpdate) => {
      set(state => ({
        health: { ...state.health, ...healthUpdate }
      }));
    },

    updateMetrics: (metricsUpdate) => {
      set(state => ({
        metrics: { ...state.metrics, ...metricsUpdate }
      }));
    },

    setError: (error) => {
      set({ error });
      
      if (error) {
        // Update health on error
        set(state => ({
          health: {
            ...state.health,
            failureCount: state.health.failureCount + 1,
            isHealthy: false
          }
        }));
      }
    },

    reset: () => {
      const unsubscribe = (window as any).__locationStoreUnsubscribe;
      if (unsubscribe) {
        unsubscribe();
        delete (window as any).__locationStoreUnsubscribe;
      }

      set({
        coords: null,
        timestamp: null,
        context: null,
        health: {
          gpsActive: false,
          lastUpdate: 0,
          accuracy: 0,
          failureCount: 0,
          isHealthy: false
        },
        hasPermission: false,
        isTracking: false,
        error: null,
        metrics: {
          totalConsumers: 0,
          activeConsumers: 0,
          writeRate: 0,
          batchSize: 0
        }
      });
    },

    // Selectors
    getDistanceFrom: (targetLat: number, targetLng: number) => {
      const { coords } = get();
      if (!coords) return null;
      
      return calculateDistance(coords.lat, coords.lng, targetLat, targetLng);
    },

    isNearby: (targetLat: number, targetLng: number, radiusMeters: number) => {
      const distance = get().getDistanceFrom(targetLat, targetLng);
      return distance !== null && distance <= radiusMeters;
    },

    getMovementStatus: () => {
      const { context } = get();
      if (!context) return 'unknown';
      
      if (context.isStationary) return 'stationary';
      if (context.isWalking) return 'walking';
      if (context.isDriving) return 'driving';
      return 'unknown';
    },

    getLocationAge: () => {
      const { timestamp } = get();
      if (!timestamp) return Infinity;
      
      return Date.now() - timestamp;
    }
  }))
);

// Selector hooks for specific data slices
export const useLocationCoords = () => useLocationStore(state => state.coords);
export const useLocationHealth = () => useLocationStore(state => state.health);
export const useMovementContext = () => useLocationStore(state => state.context);
export const useLocationMetrics = () => useLocationStore(state => state.metrics);
export const useLocationTracking = () => useLocationStore(state => ({
  isTracking: state.isTracking,
  startTracking: state.startTracking,
  stopTracking: state.stopTracking
}));

// Computed selectors
export const useLocationDistance = (targetLat: number, targetLng: number) => 
  useLocationStore(state => state.getDistanceFrom(targetLat, targetLng));

export const useLocationNearby = (targetLat: number, targetLng: number, radiusMeters: number) =>
  useLocationStore(state => state.isNearby(targetLat, targetLng, radiusMeters));

export const useMovementStatus = () => useLocationStore(state => state.getMovementStatus());

export const useLocationAge = () => useLocationStore(state => state.getLocationAge());

// Auto-start tracking when store is first accessed (if in browser)
if (typeof window !== 'undefined') {
  // Initialize store but don't auto-start tracking
  // Components should explicitly call startTracking when needed
}