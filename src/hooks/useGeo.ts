/**
 * Enhanced geolocation hook with fail-safe timeout and fallback coordinates
 */

import { useState, useEffect } from 'react';
import { getEnhancedGeolocation, type EnhancedGeoResult } from '@/lib/location/webCompatibility';
import type { LocationStatus } from '@/types/overrides';
import '@/lib/debug/geoWatcher'; // Setup debug watcher

const TIMEOUT_MS = import.meta.env.DEV || import.meta.env.VITE_FORCE_GEO_DEBUG === 'true' ? 3000 : 8000;

const DEMO_COORDS: GeolocationCoordinates = {
  latitude: 37.7749,
  longitude: -122.4194,
  altitude: null,
  altitudeAccuracy: null,
  accuracy: 20,
  heading: null,
  speed: null,
  toJSON() { return this; }
};

// Helper function to create GeolocationCoordinates from lat/lng
function createCoords(lat: number, lng: number, accuracy: number = 50): GeolocationCoordinates {
  return {
    latitude: lat,
    longitude: lng,
    altitude: null,
    altitudeAccuracy: null,
    accuracy,
    heading: null,
    speed: null,
    toJSON() { return this; }
  };
}

export interface GeoState {
  coords: { lat: number; lng: number } | null;
  accuracy: number | null;
  status: LocationStatus;
  error?: string;
  hasLocation: boolean;
  isLocationReady: boolean;
  // Legacy compatibility
  hasPermission?: boolean;
  requestLocation: () => void;
  clearWatch: () => void;
}

interface ExtendedGeoResult extends Omit<EnhancedGeoResult, 'status'> {
  status: LocationStatus;
}

export function useGeo(): GeoState {
  const [value, setValue] = useState<ExtendedGeoResult>({
    coords: null,
    timestamp: null,
    status: 'idle',
  });

  useEffect(() => {
    // Check for debug flag FIRST, before any real geolocation calls
    const force = localStorage.getItem('floq-debug-forceLoc');
    if (force) {
      console.log('[useGeo] 🔧 Debug location found:', force);
      const [latStr, lngStr] = force.split(',');
      const debugResult = {
        coords: createCoords(+latStr, +lngStr, 50), // 🔧 FIX: Use helper to create proper coords
        timestamp: Date.now(),
        status: 'ready' as const  // ★ normalize to 'ready' for UI consumption
      };
      
      console.log('[useGeo] 🔧 Setting debug coordinates:', debugResult.coords);
      
      // 🔧 DEBUG: Add window watcher for setValue calls
      (window as any).__watch = debugResult;
      
      if (import.meta.env.DEV) {
        (window as any).__FLOQ_DEBUG_LAST_GEO = debugResult;
      }
      
      setValue(debugResult);
      return; // <-- bail out, don't start real watch
    }

    // Skip if we're in debug mode with forced debug location
    if (import.meta.env.VITE_FORCE_GEO_DEBUG === 'true') {
      console.log('[useGeo] Debug mode enabled - using demo coordinates');
      const debugResult = {
        coords: DEMO_COORDS, // Use original DEMO_COORDS structure
        timestamp: Date.now(),
        status: 'ready' as const
      };
      
      if (import.meta.env.DEV) {
        (window as any).__FLOQ_DEBUG_LAST_GEO = debugResult;
      }
      
      // 🔧 DEBUG: Add window watcher for setValue calls
      (window as any).__watch = debugResult;
      
      setValue(debugResult);
      return;
    }

    let didTimeout = false;

    // ① start timeout - reduced to 3 seconds for faster fallback
    const t = setTimeout(() => {
      console.log('[useGeo] Timeout reached - falling back to demo coordinates');
      didTimeout = true;
        const timeoutResult = { 
          coords: DEMO_COORDS, // Use original DEMO_COORDS structure
          timestamp: Date.now(), 
          status: 'ready' as const 
        };
        
        if (import.meta.env.DEV) {
          (window as any).__FLOQ_DEBUG_LAST_GEO = timeoutResult;
        }
        
        setValue((old) =>
          old.coords ? old : timeoutResult
        );
    }, TIMEOUT_MS); // Dynamic timeout based on environment

    // ② call the browser
    console.log('[useGeo] Requesting geolocation...');
    setValue({ coords: null, timestamp: null, status: 'fetching' });
    getEnhancedGeolocation().then((res) => {
      if (!didTimeout) {
        console.log('[useGeo] Got location:', res.status, res.coords ? 'with coords' : 'no coords');
        clearTimeout(t);
        
        // Debug window object for console inspection
        if (import.meta.env.DEV) {
          (window as any).__FLOQ_DEBUG_LAST_GEO = res;
        }
        
        // Normalize status for UI consumption
        const normalised: ExtendedGeoResult = {
          ...res,
          status: res.status === 'fetching' ? 'loading' :
                  res.status === 'debug' ? 'ready' :
                  res.status as LocationStatus
        };
        
        // 🔧 DEBUG: Add window watcher for setValue calls
        (window as any).__watch = normalised;
        
        setValue(normalised);
      } else {
        console.log('[useGeo] Location response arrived after timeout, ignoring');
      }
    }).catch((error) => {
      console.error('[useGeo] Geolocation failed:', error);
      if (!didTimeout) {
        clearTimeout(t);
        const debugResult = { 
          coords: DEMO_COORDS, // Use original DEMO_COORDS structure
          timestamp: Date.now(), 
          status: 'ready' as const 
        };
        
        if (import.meta.env.DEV) {
          (window as any).__FLOQ_DEBUG_LAST_GEO = debugResult;
        }
        
        // 🔧 DEBUG: Add window watcher for setValue calls
        (window as any).__watch = debugResult;
        
        setValue(debugResult);
      }
    });

    return () => clearTimeout(t);
  }, []);

  // Expose the booleans the UI looks for
  const hasLocation = !!value.coords;
  const isLocationReady = hasLocation && !['fetching', 'loading', 'idle'].includes(value.status);

  return {
    coords: value.coords ? {
      lat: value.coords.latitude,  // 🔧 FIX: Convert from latitude/longitude to lat/lng
      lng: value.coords.longitude
    } : null,
    accuracy: value.coords?.accuracy ?? null,
    status: value.status,
    error: value.status === 'error' ? 'Location unavailable' : undefined,
    hasLocation,
    isLocationReady,
    // Legacy compatibility
    hasPermission: hasLocation,
    requestLocation: () => {}, // No-op for now
    clearWatch: () => {}, // No-op for now
  };
}

// Legacy exports for backward compatibility
export const useLatLng = () => useGeo().coords;
export const useLocation = () => useGeo();

export const useGeoPos = () => {
  const geo = useGeo();
  return {
    pos: geo.coords ? { lat: geo.coords.lat, lng: geo.coords.lng, accuracy: geo.accuracy || 0 } : null,
    loading: ['loading', 'fetching', 'idle'].includes(geo.status),
    error: geo.error,
  };
};