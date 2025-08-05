/**
 * Enhanced geolocation hook with fail-safe timeout and fallback coordinates
 */

import { useState, useEffect } from 'react';
import { getEnhancedGeolocation, type EnhancedGeoResult } from '@/lib/location/webCompatibility';

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
  status: 'idle' | 'fetching' | 'success' | 'error' | 'debug' | 'loading';
  error?: string;
  hasLocation: boolean;
  isLocationReady: boolean;
  // Legacy compatibility
  hasPermission?: boolean;
  requestLocation: () => void;
  clearWatch: () => void;
}

export function useGeo(): GeoState {
  const [value, setValue] = useState<EnhancedGeoResult>({
    coords: null,
    timestamp: null,
    status: 'idle',
  });

  useEffect(() => {
    // Skip if we're in debug mode with forced debug location
    if (import.meta.env.VITE_FORCE_GEO_DEBUG === 'true') {
      setValue({
        coords: DEMO_COORDS,
        timestamp: Date.now(),
        status: 'debug'
      });
      return;
    }

    let didTimeout = false;

    // ① start timeout
    const t = setTimeout(() => {
      didTimeout = true;
      setValue((old) =>
        old.coords
          ? old
          : { coords: DEMO_COORDS, timestamp: Date.now(), status: 'debug' }
      );
    }, GEO_TIMEOUT_MS);

    // ② call the browser
    setValue({ coords: null, timestamp: null, status: 'fetching' });
    getEnhancedGeolocation().then((res) => {
      if (!didTimeout) {
        clearTimeout(t);
        setValue(res);
      }
    });

    return () => clearTimeout(t);
  }, []);

  // Expose the booleans the UI looks for
  const hasLocation = !!value.coords;
  const isLocationReady = hasLocation && value.status !== 'fetching';

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