/**
 * Lightweight geolocation hook (deprecated in favour of the newer location
 * hooks under @/hooks/location/ — kept for legacy views).
 *
 *  • Single “get fix” with high accuracy (10 s window)
 *  • Optional watch with no timeout (browser decides when it can update)
 *  • Distance gate + debounce to reduce state churn
 *  • Session-storage cache for faster re-mounts
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { calculateDistance }     from '@/lib/location/standardGeo';
import { trackLocationPermission } from '@/lib/analytics';
import { geoTelemetry } from '@/lib/monitoring/telemetry';
import { loadPersistedCoords, savePersistedCoords, isStale } from '@/lib/location/geoCache';
import { getEnhancedGeolocation, webLocationHelpers } from '@/lib/location/webCompatibility';
import { isLovablePreview, platformLog } from '@/lib/platform';

/* ────────────────────────────────────────────────────────── */
/* Types                                                     */
/* ────────────────────────────────────────────────────────── */

export interface GeoOpts {
  enableHighAccuracy?: boolean;
  watch?: boolean;
  /** ignore updates closer than N m (0 = every update)            */
  minDistanceM?: number;
  /** debounce successive updates (ms)                             */
  debounceMs?: number;
}

export interface GeoState {
  coords:  { lat: number; lng: number } | null;
  accuracy: number | null;
  ts:       number | null;
  status:   'idle' | 'loading' | 'success' | 'error';
  error?:   string;
  hasPermission?: boolean;
  requestLocation: () => void;
  clearWatch:     () => void;
}

/* ────────────────────────────────────────────────────────── */
/* Defaults                                                  */
/* ────────────────────────────────────────────────────────── */

const DEF: Required<GeoOpts> = {
  enableHighAccuracy: true,
  watch:              true,
  minDistanceM:       10,
  debounceMs:         2_000,
};

/* ────────────────────────────────────────────────────────── */
/* Hook                                                      */
/* ────────────────────────────────────────────────────────── */

export function useGeo(opts: GeoOpts = {}): GeoState {
  const o = { ...DEF, ...opts };

  /* state skeleton */
  const [state, set] = useState<Omit<GeoState, 'requestLocation'|'clearWatch'>>({
    coords:        null,
    accuracy:      null,
    ts:            null,
    status:        'idle',
    hasPermission: undefined,
  });

  /* SSR guard */
  if (typeof window === 'undefined') {
    return { ...state, requestLocation: () => {}, clearWatch: () => {} };
  }

  /* refs */
  const watchId    = useRef<number | null>(null);
  const debTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFix    = useRef<{lat:number; lng:number}|null>(null);
  const asked      = useRef(false);

  /* ── 1. probe permissions (runs once) ───────────────────── */
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      set(s => ({ ...s, status: 'error', error: 'Geolocation unsupported' }));
      return;
    }

    /* check for debug location first */
    try {
      const debugLoc = localStorage.getItem('floq-debug-forceLoc');
      if (debugLoc) {
        const [lat, lng] = debugLoc.split(',').map(Number);
        if (!isNaN(lat) && !isNaN(lng)) {
          const coords = { lat, lng };
          set(s => ({ ...s, coords, status: 'success', hasPermission: true, ts: Date.now() }));
          lastFix.current = coords;
          geoTelemetry.cacheHit('debug');
          return;
        }
      }
    } catch {/* ignore */}

    /* persistent cache from localStorage with age checking */
    const persisted = loadPersistedCoords();
    if (persisted && !isStale(persisted.ts)) {
      const coords = { lat: persisted.lat, lng: persisted.lng };
      set(s => ({ ...s, coords, status: 'success', hasPermission: true, ts: Date.now() }));
      lastFix.current = coords;
      geoTelemetry.cacheHit('localStorage');
      return;
    }

    /* session cache with age validation */
    try {
      const cached = sessionStorage.getItem('floq-coords');
      if (cached) {
        const sessionCoords = JSON.parse(cached);
        // Check if session cache has timestamp and validate age
        if (sessionCoords.ts && !isStale(sessionCoords.ts)) {
          const coords = { lat: sessionCoords.lat, lng: sessionCoords.lng };
          set(s => ({ ...s, coords, status:'success', hasPermission:true, ts:Date.now() }));
          lastFix.current = coords;
          geoTelemetry.cacheHit('sessionStorage');
          return;
        } else if (!sessionCoords.ts) {
          // Legacy session cache without timestamp - use as fallback
          const coords = { lat: sessionCoords.lat, lng: sessionCoords.lng };
          set(s => ({ ...s, coords, status:'success', hasPermission:true, ts:Date.now() }));
          lastFix.current = coords;
          geoTelemetry.cacheHit('sessionStorage');
          return;
        } else {
          // Stale session cache - remove it
          sessionStorage.removeItem('floq-coords');
        }
      }
    } catch {
      sessionStorage.removeItem('floq-coords');
    }

    const handleGranted = () => {
      set(s => ({ ...s, hasPermission:true }));
      if (o.watch) {
        trackLocationPermission(true, 'auto-granted');
        requestLocation();
      }
    };

    const handleDenied  = () => {
      set(s => ({ ...s, hasPermission:false }));
      trackLocationPermission(false, 'auto');
    };

    (async () => {
      try {
        if ('permissions' in navigator) {
          const perm = await navigator.permissions.query({ name:'geolocation' as PermissionName });
          if (perm.state === 'granted')      handleGranted();
          else if (perm.state === 'denied')  handleDenied();
          else set(s => ({ ...s, hasPermission:undefined }));  // 'prompt'

          perm.onchange = () => {
            if (perm.state === 'granted')      handleGranted();
            else if (perm.state === 'denied')  handleDenied();
            else set(s => ({ ...s, hasPermission:undefined }));
          };
        }
      } catch {/* fallback: we just wait for user interaction */}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── 2. success handler ─────────────────────────────────── */
  const apply = useCallback((pos: GeolocationPosition) => {
    const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };

    /* distance gate */
    if (lastFix.current && o.minDistanceM > 0 &&
        calculateDistance(lastFix.current, p) < o.minDistanceM) return;

    /* debounce successive updates */
    if (debTimer.current) clearTimeout(debTimer.current);
    debTimer.current = setTimeout(() => {
      set(s => ({
        ...s,
        coords:  p,
        accuracy: pos.coords.accuracy,
        ts:       Date.now(),
        status:   'success',
        hasPermission: true,
      }));
      lastFix.current = p;
      try {
        const coordsWithTs = { ...p, ts: Date.now() };
        sessionStorage.setItem('floq-coords', JSON.stringify(coordsWithTs));
        savePersistedCoords(p);
      } catch {/* ignore quota / private-mode errors */}
      geoTelemetry.success(pos.coords.accuracy);
    }, o.debounceMs);
  }, [o.minDistanceM, o.debounceMs]);

  /* ── 3. failure handler (no side-effects) ───────────────── */
  const fail = useCallback((err: GeolocationPositionError) => {
    /* reset “asked” when the prompt is soft-dismissed */
    if (err.code === err.PERMISSION_DENIED && err.message.includes('User denied')) {
      asked.current = false;
    }

    /* let caller react to timeout; we just update state */
    if (err.code === err.TIMEOUT) {
      set(s => ({ ...s, status:'error', error:'timeout' }));
      return;
    }

    const msg =
      err.code === err.PERMISSION_DENIED ? 'denied' :
      err.code === err.POSITION_UNAVAILABLE ? 'unavailable' :
      err.message;

    /* telemetry */
    if (err.code === err.PERMISSION_DENIED) geoTelemetry.denied();
    else geoTelemetry.error(msg);

    set(s => ({
      ...s,
      status:'error',
      error: msg,
      hasPermission: err.code === err.PERMISSION_DENIED ? false : s.hasPermission,
    }));
  }, []);

  /* ── 4. public API ──────────────────────────────────────── */
  const requestLocation = useCallback(() => {
    if (asked.current) return;
    asked.current = true;
    set(s => ({ ...s, status:'loading' }));

    /* check for debug location */
    try {
      const debugLoc = localStorage.getItem('floq-debug-forceLoc');
      if (debugLoc) {
        const [lat, lng] = debugLoc.split(',').map(Number);
        if (!isNaN(lat) && !isNaN(lng)) {
          const mockPosition = {
            coords: { latitude: lat, longitude: lng, accuracy: 50 },
            timestamp: Date.now()
          } as GeolocationPosition;
          apply(mockPosition);
          return;
        }
      }
    } catch {/* ignore debug location errors */}

    /* add timeout handler for stuck GPS */
    const timeoutId = setTimeout(() => {
      asked.current = false;
      geoTelemetry.timeout();
      set(s => ({ ...s, status: 'error', error: 'timeout' }));
    }, 25_000);

    /* one-shot high-accuracy window (25s timeout) */
            getEnhancedGeolocation().getCurrentPosition(
      (pos) => {
        clearTimeout(timeoutId);
        apply(pos);
      },
      (err) => {
        clearTimeout(timeoutId);
        asked.current = false;
        fail(err);
      },
      { enableHighAccuracy:o.enableHighAccuracy, timeout:25_000, maximumAge:0 },
    );

    /* continuous updates (25s timeout) */
    if (o.watch) {
      watchId.current = getEnhancedGeolocation().watchPosition(
        apply,
        fail,
        { enableHighAccuracy:o.enableHighAccuracy, timeout:25_000, maximumAge:60_000 },
      );
    }
  }, [apply, fail, o.enableHighAccuracy, o.watch]);

  const clearWatch = useCallback(() => {
          if (watchId.current !== null) getEnhancedGeolocation().clearWatch(watchId.current);
    if (debTimer.current) clearTimeout(debTimer.current);
    watchId.current = null;
    debTimer.current = null;
    asked.current = false;
  }, []);

  /* stop watch when tab hidden / resume on focus */
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'hidden') clearWatch();
      else if (o.watch && state.status !== 'loading') requestLocation();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => { document.removeEventListener('visibilitychange', onVis); clearWatch(); };
  }, [clearWatch, requestLocation, o.watch, state.status]);

  return { ...state, requestLocation, clearWatch };
}

/* ────────────────────────────────────────────────────────── */
/* Convenience selectors                                      */
/* ────────────────────────────────────────────────────────── */

export const useLatLng   = () => useGeo({ watch:false }).coords;
export const useLocation = () => useGeo();

export const useGeoPos   = () => {
  const geo = useGeo();
  return {
    pos: geo.coords ? { lat:geo.coords.lat, lng:geo.coords.lng, accuracy:geo.accuracy||0 } : null,
    loading: geo.status === 'loading',
    error:   geo.error,
  };
};