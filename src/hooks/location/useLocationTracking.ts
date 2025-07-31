/**
 * Location tracking hook - handles GPS + server-side location recording
 * Built on top of useLocationCore but adds tracking/persistence logic
 */
import { useRef, useEffect, useCallback } from 'react';
import { useLocationCore, type LocationCoreOptions } from './useLocationCore';
import { supabase } from '@/integrations/supabase/client';
import { calculateDistance } from '@/lib/location/standardGeo';

interface LocationPing {
  ts: string;
  lat: number;
  lng: number;
  acc: number;
}

export interface LocationTrackingOptions extends LocationCoreOptions {
  /** How often to flush tracking buffer (ms) */
  flushIntervalMs?: number;
  /** Minimum distance between recorded points (meters) */
  trackingMinDistanceM?: number;
  /** Minimum time between recorded points (ms) */
  trackingMinTimeMs?: number;
}

const DEFAULT_TRACKING_OPTIONS = {
  flushIntervalMs: 15000, // 15 seconds
  trackingMinDistanceM: 10, // 10 meters
  trackingMinTimeMs: 20000, // 20 seconds
};

/**
 * Enhanced location hook that records GPS points to the server
 */
export function useLocationTracking(options: LocationTrackingOptions = {}) {
  const trackingOpts = { ...DEFAULT_TRACKING_OPTIONS, ...options };
  const core = useLocationCore(options);
  
  const bufferRef = useRef<LocationPing[]>([]);
  const flushIntervalRef = useRef<number | null>(null);
  const userIdRef = useRef<string | null>(null);

  const flushBuffer = useCallback(async () => {
    if (bufferRef.current.length === 0) return;

    try {
      // Cache user ID for efficiency
      if (!userIdRef.current) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        userIdRef.current = user.id;
      }

      const batch = bufferRef.current.splice(0, bufferRef.current.length);

      const { error } = await supabase.functions.invoke('record_locations', {
        body: { batch }
      });

      if (error) {
        console.error('[LocationTracking] Failed to record locations:', error);
        // Re-add failed items to buffer for retry
        bufferRef.current.unshift(...batch);
      }
    } catch (err) {
      console.error('[LocationTracking] Flush error:', err);
    }
  }, []);

  const startTracking = useCallback(async () => {
    if (import.meta.env.DEV) {
      console.log('[LocationTracking] Starting location tracking...');
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('[LocationTracking] Not authenticated');
        return;
      }
      userIdRef.current = user.id;

      // Start core GPS tracking
      core.requestLocation();

      // Start flush interval
      if (!flushIntervalRef.current) {
        flushIntervalRef.current = setInterval(flushBuffer, trackingOpts.flushIntervalMs);
      }

    } catch (err) {
      console.error('[LocationTracking] Start error:', err);
    }
  }, [core, flushBuffer, trackingOpts.flushIntervalMs]);

  const stopTracking = useCallback(() => {
    if (import.meta.env.DEV) {
      console.log('[LocationTracking] Stopping location tracking...');
    }
    // Stop core GPS
    core.clearWatch();

    // Clear flush interval
    if (flushIntervalRef.current) {
      clearInterval(flushIntervalRef.current);
      flushIntervalRef.current = null;
    }

    // Final flush
    flushBuffer();
    bufferRef.current = [];
  }, [core, flushBuffer]);

  // Handle location updates from core
  useEffect(() => {
    if (!core.coords || !userIdRef.current) return;

    const now = Date.now();
    const { lat, lng } = core.coords;
    const accuracy = core.accuracy || 0;

    const newPing: LocationPing = {
      ts: new Date().toISOString(),
      lat,
      lng,
      acc: accuracy
    };

    // Apply tracking distance and time gates
    const lastPing = bufferRef.current.at(-1);
    if (lastPing) {
      const timeDiff = now - new Date(lastPing.ts).valueOf();
      const distance = calculateDistance(
        { lat, lng },
        { lat: lastPing.lat, lng: lastPing.lng }
      );
      
      if (distance < trackingOpts.trackingMinDistanceM && 
          timeDiff < trackingOpts.trackingMinTimeMs) {
        return; // Skip recording this point
      }
    }

    bufferRef.current.push(newPing);
  }, [core.coords, core.accuracy, trackingOpts.trackingMinDistanceM, trackingOpts.trackingMinTimeMs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  return {
    // Core location data
    coords: core.coords,
    accuracy: core.accuracy,
    timestamp: core.timestamp,
    status: core.status,
    error: core.error,
    hasPermission: core.hasPermission,
    
    // Tracking controls
    isTracking: core.status === 'success' || core.status === 'loading',
    startTracking,
    stopTracking,
    
    // Buffer info for debugging
    bufferSize: bufferRef.current.length,
  };
}