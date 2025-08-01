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

    /* cached coords speed-up (session-scope) */
    try {
      const cached = sessionStorage.getItem('floq-coords');
      if (cached) {
        const coords = JSON.parse(cached);
        set(s => ({ ...s, coords, status:'success', hasPermission:true, ts:Date.now() }));
        lastFix.current = coords;
        return;
      }
    } catch {/* ignore */}

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
        sessionStorage.setItem('floq-coords', JSON.stringify(p));
      } catch {/* ignore quota / private-mode errors */}
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

    /* one-shot high-accuracy window (10 s) */
    navigator.geolocation.getCurrentPosition(
      apply,
      fail,
      { enableHighAccuracy:o.enableHighAccuracy, timeout:10_000, maximumAge:0 },
    );

    /* continuous updates (no timeout) */
    if (o.watch) {
      watchId.current = navigator.geolocation.watchPosition(
        apply,
        fail,
        { enableHighAccuracy:o.enableHighAccuracy, maximumAge:15_000 },
      );
    }
  }, [apply, fail, o.enableHighAccuracy, o.watch]);

  const clearWatch = useCallback(() => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
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