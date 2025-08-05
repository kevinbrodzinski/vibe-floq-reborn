/**
 * Thin wrapper around `navigator.geolocation` that
 *  • provides a 3 s fallback to SF (dev) or 8 s timeout (prod)
 *  • honours localStorage['floq-debug-forceLoc'] for easy testing
 *  • never overwrites real GPS with demo data in production
 */
import { useEffect, useState } from 'react';
import { getEnhancedGeolocation } from '@/lib/location/webCompatibility';
import type { LocationStatus } from '@/types/overrides';

//
// ──────────────────────────────────────────────────────────────────────────────
//  Types
// ──────────────────────────────────────────────────────────────────────────────
//
export interface GeoCoords {
  lat: number;
  lng: number;
  accuracy?: number;
}

export interface GeoState {
  coords: GeoCoords | null;
  accuracy: number | null;
  status: LocationStatus;
  hasLocation: boolean;
  isLocationReady: boolean;
  // legacy shims
  hasPermission?: boolean;
  requestLocation: () => void;
  clearWatch: () => void;
}

//
// ──────────────────────────────────────────────────────────────────────────────
//  Constants
// ──────────────────────────────────────────────────────────────────────────────
//
const DEMO_COORDS = { lat: 37.7749, lng: -122.4194 } as const;
const TIMEOUT_MS  = import.meta.env.DEV ? 3_000 : 8_000;

//
// ──────────────────────────────────────────────────────────────────────────────
//  Hook
// ──────────────────────────────────────────────────────────────────────────────
//
export function useGeo(): GeoState {
  const [state, setState] = useState<{
    coords: GeoCoords | null;
    status: LocationStatus;
  }>({ coords: null, status: 'idle' });

  useEffect(() => {
    let done = false;

    /** Helper to push a result into state only once */
    const push = (coords: GeoCoords | null, status: LocationStatus) => {
      if (done) return;
      done = true;
      setState({ coords, status });
    };

    /* ─ 1. Debug override via localStorage ───────────────────────────── */
    const debug = localStorage.getItem('floq-debug-forceLoc');
    if (debug) {
      const [lat, lng] = debug.split(',').map(Number);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        push({ lat, lng, accuracy: 15 }, 'ready');
        return;
      }
    }

    /* ─ 2. Fallback timer ────────────────────────────────────────────── */
    const fallback = setTimeout(() => {
      if (import.meta.env.DEV) {
        console.warn('[useGeo] timeout → using demo coords');
        push({ ...DEMO_COORDS, accuracy: 50 }, 'ready');
      } else {
        console.warn('[useGeo] timeout → no coords');
        push(null, 'error');
      }
    }, TIMEOUT_MS);

    /* ─ 3. Real geolocation request ──────────────────────────────────── */
    getEnhancedGeolocation({
      enableHighAccuracy: true,
      timeout: TIMEOUT_MS - 500,
      maximumAge: 60_000,
    })
      .then((res) => {
        clearTimeout(fallback);
        if (res.coords) {
          push(
            {
              lat: res.coords.latitude,
              lng: res.coords.longitude,
              accuracy: res.coords.accuracy ?? 50,
            },
            'ready'
          );
        } else {
          // extremely rare: promise resolved but no coords
          push(null, 'error');
        }
      })
      .catch((err) => {
        clearTimeout(fallback);
        console.error('[useGeo] geolocation failed:', err);
        push(null, 'error');
      });

    return () => clearTimeout(fallback);
  }, []);

  const has    = !!state.coords;
  const ready  = has && state.status === 'ready';

  return {
    coords: state.coords,
    accuracy: state.coords?.accuracy ?? null,
    status: state.status,
    hasLocation: has,
    isLocationReady: ready,
    // legacy no-ops
    hasPermission: has,
    requestLocation: () => {
      navigator.geolocation?.getCurrentPosition(() => {}, () => {}, {
        enableHighAccuracy: true,
      });
    },
    clearWatch: () => {},
  };
}

//
// ──────────────────────────────────────────────────────────────────────────────
//  Legacy re-exports (keep older code working)
// ──────────────────────────────────────────────────────────────────────────────
//
export const useLatLng   = () => useGeo().coords;
export const useLocation = useGeo;

export const useGeoPos = () => {
  const g = useGeo();
  return {
    pos: g.coords
      ? { lat: g.coords.lat, lng: g.coords.lng, accuracy: g.accuracy || 0 }
      : null,
    loading: !g.isLocationReady,
    error: g.status === 'error' ? 'Location unavailable' : undefined,
  };
};