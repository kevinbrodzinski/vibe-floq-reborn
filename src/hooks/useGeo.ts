/**
 * Enhanced geolocation hook with fail-safe timeout and fallback coordinates
 */

import { useState, useEffect } from 'react';
import { getEnhancedGeolocation, type EnhancedGeoResult } from '@/lib/location/webCompatibility';
import type { LocationStatus } from '@/types/overrides';
import '@/lib/debug/geoWatcher'; // Setup debug watcher

const TIMEOUT_MS = import.meta.env.DEV || import.meta.env.VITE_FORCE_GEO_DEBUG === 'true' ? 3000 : 8000;

const DEMO_COORDS = { lat: 37.7749, lng: -122.4194 };   // ✅ keep

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

// Normalize browser coords to our format
const normaliseBrowserCoords = (g: GeolocationCoordinates): GeoCoords => ({
  lat: g.latitude,
  lng: g.longitude,
  accuracy: g.accuracy ?? 50,
});

export interface GeoCoords {
  lat: number;
  lng: number;
  accuracy?: number;
}

export interface GeoState {
  coords: GeoCoords | null;
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

interface ExtendedGeoResult {
  coords: GeoCoords | null;
  timestamp: number | null;
  status: LocationStatus;
}

export function useGeo(): GeoState {
  const [value, setValue] = useState<ExtendedGeoResult>({
    coords: null,
    timestamp: null,
    status: 'idle',
  });

  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    if (hasInitialized) return;
    setHasInitialized(true);

    /* ---------- 1. DEBUG-COORD SHORT-CIRCUIT ---------- */
    const force = localStorage.getItem('floq-debug-forceLoc');
    if (force) {
      const [latStr, lngStr] = force.split(',');
      const debugCoords = {
        lat: +latStr || DEMO_COORDS.lat,
        lng: +lngStr || DEMO_COORDS.lng,
        accuracy: 15
      };

      /** 🔧 expose for console inspection */
      (window as any).__FLOQ_DEBUG_LAST_GEO = debugCoords;

      /*  ⬇️  PUSH IT FORWARD  */
      setValue({
        coords: debugCoords,        // ← this is what FieldLocationProvider consumes
        timestamp: Date.now(),
        status: 'ready',
      });
      return;                       // 💡 VERY IMPORTANT – do *not* start watchPosition
    }

    /* ---------- 2. NORMAL GEOLOCATION WATCH ---------- */
    // Phase 2: Check environment debug mode
    if (import.meta.env.VITE_FORCE_GEO_DEBUG === 'true') {
      console.log('[useGeo] Environment debug mode - using demo coordinates');
      const debugResult = {
        coords: DEMO_COORDS,
        timestamp: Date.now(),
        status: 'ready' as const
      };
      
      (window as any).__FLOQ_DEBUG_LAST_GEO = debugResult;
      setValue(debugResult);
      return;
    }

    // Phase 3: For Lovable preview, auto-enable fallback after short delay
    if (import.meta.env.DEV && location.hostname.includes('lovable')) {
      console.log('[useGeo] 🔧 Lovable preview detected - enabling auto-fallback in 2 seconds');
      setTimeout(() => {
        console.log('[useGeo] 🔧 Auto-enabling debug location for preview');
        localStorage.setItem('floq-debug-forceLoc', '37.7749,-122.4194');
        window.location.reload();
      }, 2000);
    }

    let didTimeout = false;

    // Phase 4: Set up fallback timer (reduced for faster development)
    const fallbackTimer = setTimeout(() => {
      if (!didTimeout) {
        console.log('[useGeo] ⏰ Timeout reached - using fallback coordinates');
        didTimeout = true;
        
        const fallbackResult = { 
          coords: DEMO_COORDS,
          timestamp: Date.now(), 
          status: 'ready' as const 
        };
        
        (window as any).__FLOQ_DEBUG_LAST_GEO = fallbackResult;
        (window as any).__watch = fallbackResult;
        
        setValue((prev) => prev.coords ? prev : fallbackResult);
      }
    }, TIMEOUT_MS);

    // Phase 5: Attempt real geolocation
    console.log('[useGeo] 📍 Requesting browser geolocation...');
    setValue({ coords: null, timestamp: null, status: 'fetching' });
    
    getEnhancedGeolocation({
      enableHighAccuracy: true,
      timeout: TIMEOUT_MS - 500, // Leave 500ms buffer for cleanup
      maximumAge: 30000
    }).then((res) => {
      if (!didTimeout) {
        console.log('[useGeo] ✅ Real location received:', res.status, res.coords ? 'with coords' : 'no coords');
        clearTimeout(fallbackTimer);
        
        (window as any).__FLOQ_DEBUG_LAST_GEO = res;
        
        const normalizedResult: ExtendedGeoResult = {
          coords: res.coords ? normaliseBrowserCoords(res.coords) : null,
          timestamp: res.timestamp,
          status: res.status === 'fetching' ? 'loading' :
                  res.status === 'debug' ? 'ready' :
                  res.status as LocationStatus
        };
        
        (window as any).__watch = normalizedResult;
        setValue(normalizedResult);
      } else {
        console.log('[useGeo] ⚠️ Real location arrived after timeout, using fallback');
      }
    }).catch((error) => {
      console.error('[useGeo] ❌ Geolocation failed:', error);
      if (!didTimeout) {
        clearTimeout(fallbackTimer);
        const errorFallback = { 
          coords: DEMO_COORDS,
          timestamp: Date.now(), 
          status: 'ready' as const 
        };
        
        (window as any).__FLOQ_DEBUG_LAST_GEO = errorFallback;
        (window as any).__watch = errorFallback;
        
        setValue(errorFallback);
      }
    });

    return () => {
      clearTimeout(fallbackTimer);
    };
  }, [hasInitialized]);

  // Expose the booleans the UI looks for
  const hasLocation = !!value.coords;
  const isLocationReady = hasLocation && !['fetching', 'loading', 'idle'].includes(value.status);

  return {
    coords: value.coords,
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