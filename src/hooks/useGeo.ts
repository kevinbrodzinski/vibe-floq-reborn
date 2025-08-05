/**
 * Enhanced geolocation hook with fail-safe timeout and fallback coordinates
 */

import { useState, useEffect } from 'react';
import { getEnhancedGeolocation, type EnhancedGeoResult } from '@/lib/location/webCompatibility';
import type { LocationStatus } from '@/types/overrides';

const GEO_TIMEOUT_MS = 5_000;

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
    // Skip if we're in debug mode with forced debug location
    if (import.meta.env.VITE_FORCE_GEO_DEBUG === 'true') {
      console.log('[useGeo] Debug mode enabled - using demo coordinates');
      const debugResult = {
        coords: DEMO_COORDS,
        timestamp: Date.now(),
        status: 'ready' as const
      };
      
      if (import.meta.env.DEV) {
        (window as any).__FLOQ_DEBUG_LAST_GEO = debugResult;
      }
      
      setValue(debugResult);
      return;
    }

    let didTimeout = false;

    // ① start timeout - reduced to 3 seconds for faster fallback
    const t = setTimeout(() => {
      console.log('[useGeo] Timeout reached - falling back to demo coordinates');
      didTimeout = true;
        const timeoutResult = { coords: DEMO_COORDS, timestamp: Date.now(), status: 'ready' as const };
        
        if (import.meta.env.DEV) {
          (window as any).__FLOQ_DEBUG_LAST_GEO = timeoutResult;
        }
        
        setValue((old) =>
          old.coords ? old : timeoutResult
        );
    }, 3000); // Reduced from GEO_TIMEOUT_MS to 3 seconds

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
        setValue(normalised);
      } else {
        console.log('[useGeo] Location response arrived after timeout, ignoring');
      }
    }).catch((error) => {
      console.error('[useGeo] Geolocation failed:', error);
      if (!didTimeout) {
        clearTimeout(t);
        const debugResult = { coords: DEMO_COORDS, timestamp: Date.now(), status: 'ready' as const };
        
        if (import.meta.env.DEV) {
          (window as any).__FLOQ_DEBUG_LAST_GEO = debugResult;
        }
        
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
      lat: value.coords.latitude,
      lng: value.coords.longitude
    } : null,
    accuracy: value.coords?.accuracy || null,
    status: value.status === 'fetching' ? 'loading' : value.status,
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
    loading: geo.status === 'loading' || geo.status === 'fetching',
    error: geo.error,
  };
};