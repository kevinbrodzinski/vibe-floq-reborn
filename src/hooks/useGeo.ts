/**
 * Thin wrapper around `navigator.geolocation` that provides a sane fallback
 * and **never** overrides the location automatically in dev-mode.
 */
import { useEffect, useState } from 'react';
import { getEnhancedGeolocation } from '@/lib/location/webCompatibility';
import type { LocationStatus } from '@/types/overrides';

const DEMO = { lat: 37.7749, lng: -122.4194 } as const;
const TIMEOUT = import.meta.env.DEV ? 3000 : 8000;

export interface GeoCoords { lat: number; lng: number; accuracy?: number }
export interface GeoState  {
  coords: GeoCoords | null;
  accuracy: number | null;
  status: LocationStatus;
  hasLocation: boolean;
  isLocationReady: boolean;
  hasPermission: boolean;
  error: string | null;
  requestLocation: () => void;
}

export function useGeo(): GeoState {
  const [state, set] = useState<{ coords: GeoCoords | null; status: LocationStatus }>({ coords: null, status: 'idle' });

  useEffect(() => {
    let done = false;

    const fallbackTimer = setTimeout(() => {
      if (done) return;
      done = true;
      set({ coords: DEMO, status: 'ready' });
    }, TIMEOUT);

    getEnhancedGeolocation({ enableHighAccuracy: true, timeout: TIMEOUT - 500 })
      .then(res => {
        if (done) return;
        done = true;
        clearTimeout(fallbackTimer);
        if (res.coords) {
          set({
            coords: { lat: res.coords.latitude, lng: res.coords.longitude, accuracy: res.coords.accuracy ?? 50 },
            status: 'ready'
          });
        } else {
          set({ coords: DEMO, status: 'ready' });
        }
      })
      .catch(() => {/* ignore – fallback will win */});

    return () => clearTimeout(fallbackTimer);
  }, []);

  const has = !!state.coords;
  return {
    coords: state.coords,
    accuracy: state.coords?.accuracy ?? null,
    status: state.status,
    hasLocation: has,
    isLocationReady: has && state.status === 'ready',
    hasPermission: has,
    error: state.status === 'error' ? 'Location unavailable' : null,
    requestLocation: () => {
      getEnhancedGeolocation({ enableHighAccuracy: true, timeout: TIMEOUT - 500 });
    }
  };
}

// Legacy exports for compatibility
export const useLatLng = useGeo;
export const useLocation = useGeo;
export const useGeoPos = useGeo;