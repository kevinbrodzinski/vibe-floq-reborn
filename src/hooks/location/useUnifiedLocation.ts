/**
 * Unified Location Hook - Single source of truth for all location needs
 * Uses GlobalLocationManager to prevent multiple GPS watches
 * Includes smart batching and circuit breaker protection
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { globalLocationManager } from '@/lib/location/GlobalLocationManager';
import { executeWithCircuitBreaker } from '@/lib/database/CircuitBreaker';
import { supabase } from '@/integrations/supabase/client';
import { calculateDistance } from '@/lib/location/standardGeo';
import { callFn } from '@/lib/callFn';

interface LocationPing {
  ts: string;
  lat: number;
  lng: number;
  acc: number;
}

interface LocationCoords {
  lat: number;
  lng: number;
  accuracy: number;
}

interface UnifiedLocationOptions {
  /** Enable server-side location recording */
  enableTracking?: boolean;
  /** Enable real-time presence sharing */
  enablePresence?: boolean;
  /** Flush interval for batched location data (ms) */
  flushIntervalMs?: number;
  /** Minimum distance between recorded points (meters) */
  minDistanceM?: number;
  /** Minimum time between recorded points (ms) */
  minTimeMs?: number;
  /** Unique identifier for this hook instance */
  hookId?: string;
}

interface UnifiedLocationState {
  coords: LocationCoords | null;
  timestamp: number | null;
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
  hasPermission: boolean;
  isTracking: boolean;
  bufferSize: number;
}

const DEFAULT_OPTIONS: Required<UnifiedLocationOptions> = {
  enableTracking: true,
  enablePresence: false,
  flushIntervalMs: 30000, // Increased from 15s to 30s to reduce database load
  minDistanceM: 10,
  minTimeMs: 20000,
  hookId: 'default'
};

/**
 * Unified location hook that coordinates all location functionality
 */
export function useUnifiedLocation(options: UnifiedLocationOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const hookId = `unified-location-${opts.hookId}`;
  
  const [state, setState] = useState<UnifiedLocationState>({
    coords: null,
    timestamp: null,
    status: 'idle',
    error: null,
    hasPermission: false,
    isTracking: false,
    bufferSize: 0
  });
  
  const bufferRef = useRef<LocationPing[]>([]);
  const flushIntervalRef = useRef<number | null>(null);
  const userIdRef = useRef<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  
  // Smart batching: flush buffer when it gets too large or on interval
  const flushBuffer = useCallback(async () => {
    if (bufferRef.current.length === 0) return;
    
    try {
      // Get user ID if not cached
      if (!userIdRef.current) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        userIdRef.current = user.id;
      }
      
      const batch = bufferRef.current.splice(0, bufferRef.current.length);
      
      // Use circuit breaker to protect database
      await executeWithCircuitBreaker(
        () => callFn('record_locations', { batch }),
        `location-batch-${hookId}`,
        'medium'
      );
      
      console.log(`[UnifiedLocation:${hookId}] Flushed ${batch.length} location points`);
      
    } catch (error: any) {
      console.error(`[UnifiedLocation:${hookId}] Failed to flush location buffer:`, error);
      // Re-add failed items back to buffer for retry (but limit buffer size)
      if (bufferRef.current.length < 100) { // Prevent memory bloat
        bufferRef.current.unshift(...batch.slice(-50)); // Only keep last 50 failed items
      }
    }
    
    // Update buffer size in state
    setState(prev => ({ ...prev, bufferSize: bufferRef.current.length }));
  }, [hookId]);
  
  // Handle location updates from global manager
  const handleLocationUpdate = useCallback((position: GeolocationPosition) => {
    const coords = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy
    };
    
    setState(prev => ({
      ...prev,
      coords,
      timestamp: position.timestamp,
      status: 'success',
      error: null,
      hasPermission: true
    }));
    
    // Add to tracking buffer if enabled
    if (opts.enableTracking && userIdRef.current) {
      const now = Date.now();
      const newPing: LocationPing = {
        ts: new Date().toISOString(),
        lat: coords.lat,
        lng: coords.lng,
        acc: coords.accuracy
      };
      
      // Apply distance and time gates
      const lastPing = bufferRef.current.at(-1);
      if (lastPing) {
        const timeDiff = now - new Date(lastPing.ts).valueOf();
        const distance = calculateDistance(
          { lat: coords.lat, lng: coords.lng },
          { lat: lastPing.lat, lng: lastPing.lng }
        );
        
        if (distance < opts.minDistanceM && timeDiff < opts.minTimeMs) {
          return; // Skip this update
        }
      }
      
      bufferRef.current.push(newPing);
      
      // Smart batching: flush if buffer gets large
      if (bufferRef.current.length >= 10) {
        flushBuffer();
      }
      
      setState(prev => ({ ...prev, bufferSize: bufferRef.current.length }));
    }
  }, [opts.enableTracking, opts.minDistanceM, opts.minTimeMs, flushBuffer]);
  
  // Handle location errors
  const handleLocationError = useCallback((error: GeolocationPositionError) => {
    setState(prev => ({
      ...prev,
      status: 'error',
      error: error.message,
      isTracking: false
    }));
  }, []);
  
  // Start location tracking
  const startTracking = useCallback(async () => {
    try {
      // Get user ID for tracking
      if (opts.enableTracking) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('Not authenticated');
        }
        userIdRef.current = user.id;
      }
      
      setState(prev => ({ ...prev, status: 'loading', isTracking: true }));
      
      // Subscribe to global location manager
      unsubscribeRef.current = globalLocationManager.subscribe(
        hookId,
        handleLocationUpdate,
        handleLocationError,
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 30000
        }
      );
      
      // Start flush interval for tracking
      if (opts.enableTracking && !flushIntervalRef.current) {
        flushIntervalRef.current = setInterval(flushBuffer, opts.flushIntervalMs);
      }
      
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: error.message,
        isTracking: false
      }));
    }
  }, [hookId, opts.enableTracking, opts.flushIntervalMs, handleLocationUpdate, handleLocationError, flushBuffer]);
  
  // Stop location tracking
  const stopTracking = useCallback(async () => {
    setState(prev => ({ ...prev, isTracking: false }));
    
    // Unsubscribe from global location manager
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    
    // Clear flush interval
    if (flushIntervalRef.current) {
      clearInterval(flushIntervalRef.current);
      flushIntervalRef.current = null;
    }
    
    // Final flush of any remaining data
    if (opts.enableTracking) {
      await flushBuffer();
    }
  }, [opts.enableTracking, flushBuffer]);
  
  // Auto-cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);
  
  // Legacy compatibility interfaces
  const location = state.coords ? {
    coords: {
      latitude: state.coords.lat,
      longitude: state.coords.lng,
      accuracy: state.coords.accuracy
    },
    geohash: '' // Could be computed if needed
  } : null;
  
  const pos = state.coords;
  
  return {
    // New unified interface
    ...state,
    startTracking,
    stopTracking,
    
    // Legacy compatibility
    location,
    pos,
    loading: state.status === 'loading',
    isTracking: state.isTracking,
    
    // Debug info
    debugInfo: {
      hookId,
      options: opts,
      globalManagerInfo: globalLocationManager.getDebugInfo()
    }
  };
}