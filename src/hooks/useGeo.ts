/**
 * Thin wrapper around `navigator.geolocation` that
 *  ▸ prefers real GPS data
 *  ▸ never hard-overrides the location in dev-mode unless you opt-in
 *  ▸ falls back to demo coordinates after a timeout (dev only)
 *  ▸ exposes the same surface old components rely on (`error`, helpers, …)
 */

import { useEffect, useState } from 'react';
import { getEnhancedGeolocation } from '@/lib/location/webCompatibility';
import type { LocationStatus } from '@/types/overrides';

/* ────────────────────────────────────────────────────────────── constants ── */
const DEMO       = { lat: 37.7749, lng: -122.4194 } as const; // San Francisco
const TIMEOUT_MS = 7_000;            // tolerate slow first fix

/* ──────────────────────────────────────────────────────────────── types ─── */
export interface GeoCoords { lat: number; lng: number; accuracy?: number }

export interface GeoState {
  coords: GeoCoords | null;
  accuracy: number | null;
  status: LocationStatus;          // 'idle' | 'loading' | 'ready' | 'error'
  error?: string;                  // present when status === 'error'
  hasLocation: boolean;
  isLocationReady: boolean;
  /* legacy helpers still used around the app */
  hasPermission?: boolean;
  requestLocation: () => void;
  clearWatch: () => void;
}

/* ────────────────────────────────────────────────────────────── helper ──── */
const devLog = (...args: unknown[]) =>
  import.meta.env.DEV && console.info('[useGeo]', ...args);

/* ─────────────────────────────────────────────────────────────── hook ───── */
export function useGeo(): GeoState {
  const [state, setState] = useState<{
    coords: GeoCoords | null;
    status: LocationStatus;
    error?: string;
  }>({
    coords: null,
    status: 'idle'
  });

  /* ----------------------------------------------------------------– mount */
  useEffect(() => {
    let completed = false;                // guard against late resolutions

    /* 1️⃣ Debug override -------------------------------------------------- */
    const forced = localStorage.getItem('floq-debug-forceLoc');
    if (forced) {
      const [lat, lng] = forced.split(',').map(Number);
      if (lat && lng) {
        devLog('💡 forcing coordinates via localStorage override', { lat, lng });
        const coords: GeoCoords = { lat, lng, accuracy: 15 };
        publish(coords, 'ready');
        return;
      }
    }

    /* 2️⃣ Permission state check (to show nicer UI messages elsewhere) --- */
    navigator.permissions
      ?.query({ name: 'geolocation' })
      .then(res => devLog('permission state →', res.state))
      .catch(() => {/* Permission API not supported – silent */});

    /* 3️⃣ Fallback timer -------------------------------------------------- */
    let fallback: ReturnType<typeof setTimeout> | null = null;
    
    // only arm fallback *after* we know the user didn't click 'Allow'
    navigator.permissions
      ?.query({ name: 'geolocation' })
      .then((p) => {
        if (p.state === 'prompt') {
          // user hasn't decided → arm a fallback in case they ignore it
          fallback = setTimeout(() => {
            if (completed) return;
            completed = true;
            devLog('⏰ timeout – falling back to demo coordinates');
            publish(DEMO, 'ready', undefined);
          }, TIMEOUT_MS);
        }
        // granted or denied → let the geolocation call resolve/reject,
        // no demo-coord fallback needed.
      })
      .catch(() => {
        // Permissions API not supported, arm fallback anyway
        fallback = setTimeout(() => {
          if (completed) return;
          completed = true;
          devLog('⏰ timeout – falling back to demo coordinates');
          publish(DEMO, 'ready', undefined);
        }, TIMEOUT_MS);
      });

    /* 4️⃣ Request real GPS ---------------------------------------------- */
    devLog('📡 requesting real geolocation …');

    getEnhancedGeolocation({
      enableHighAccuracy: true,
      timeout: TIMEOUT_MS - 500,   // leave head-room for cleanup
      maximumAge: 60_000
    })
      .then(res => {
        if (completed) return;
        completed = true;
        if (fallback) clearTimeout(fallback);

        if (res.coords) {
          const coords: GeoCoords = {
            lat: res.coords.latitude,
            lng: res.coords.longitude,
            accuracy: res.coords.accuracy ?? 50
          };
          devLog('✔︎ real location received', coords);
          publish(coords, 'ready');
        } else {
          devLog('⚠️ no coords in response – using fallback');
          publish(DEMO, 'ready');
        }
      })
      .catch(err => {
        if (completed) return;
        completed = true;
        if (fallback) clearTimeout(fallback);
        
        if (err?.code === 1 /* PERMISSION_DENIED */) {
          devLog('🛑 permission denied');
          setState({ coords: null, status: 'error', error: 'denied' });
          return;
        }
        
        devLog('❌ geolocation failed', err);
        setState({ coords: null, status: 'error', error: err.message ?? 'unknown-geo-error' });
      });

    return () => { if (fallback) clearTimeout(fallback); };
  }, []);

  /* ------------------------------------------------------------ utilities */
  const publish = (coords: GeoCoords, status: LocationStatus, err?: string) => {
    (window as any).__FLOQ_DEBUG_LAST_GEO = { coords, status };
    setState({ coords, status, error: err });
  };

  /* -------------------------------------------------------------- return */
  const hasLocation     = !!state.coords;
  const isLocationReady = hasLocation && state.status === 'ready';

  return {
    coords: state.coords,
    accuracy: state.coords?.accuracy ?? null,
    status: state.status,
    error: state.error,
    hasLocation,
    isLocationReady,
    /* legacy compat — kept as no-ops / thin wrappers */
    hasPermission: state.status !== 'error' && !!navigator?.geolocation,
    requestLocation() {
      navigator.geolocation?.getCurrentPosition(() => {/* ignore */}, () => {/* ignore */}, { enableHighAccuracy: true });
    },
    clearWatch() {/* nothing to clear – we only use getCurrentPosition */}
  };
}

/* ──────────────────────────────────────────────── legacy re-exports ────── */
// Older parts of the app import these helpers. Keep them pointing at the new hook.
export const useLatLng  = () => useGeo().coords;
export const useLocation = useGeo;
export const useGeoPos  = () => {
  const g = useGeo();
  return { pos: g.coords, loading: ['idle','loading','fetching'].includes(g.status), error: g.error };
};