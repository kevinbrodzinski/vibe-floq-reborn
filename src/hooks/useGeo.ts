import { useState, useEffect, useRef, useCallback } from 'react';
import { trackLocationPermission } from '@/lib/analytics';
import { toast } from 'sonner';

/* ––––– public API ––––– */
export interface GeoOpts {
  enableHighAccuracy?: boolean;
  watch?: boolean;
  /** ignore updates closer than N metres (0 = every update) */
  minDistanceM?: number;
  /** debounce successive updates (ms) */
  debounceMs?: number;
}

export interface GeoState {
  coords: { lat: number; lng: number } | null;
  accuracy: number | null;
  ts: number | null;
  status: 'idle' | 'loading' | 'success' | 'error';
  error?: string;
  hasPermission?: boolean;
  requestLocation: () => void;
  clearWatch: () => void;
}

/* ––––– defaults ––––– */
const DEF: Required<GeoOpts> = {
  enableHighAccuracy: true,
  watch: true,
  minDistanceM: 10,
  debounceMs: 2000,
};

/* ––––– helpers ––––– */
const haversine = (
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) => {
  const R = 6371e3;
  const φ1 = a.lat * Math.PI / 180;
  const φ2 = b.lat * Math.PI / 180;
  const dφ = (b.lat - a.lat) * Math.PI / 180;
  const dλ = (b.lng - a.lng) * Math.PI / 180;
  const h = Math.sin(dφ / 2) ** 2 +
           Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

/* ––––– main hook ––––– */
export function useGeo(opts: GeoOpts = {}): GeoState {
  const o = { ...DEF, ...opts };

  const [state, set] = useState<Omit<GeoState, 'requestLocation' | 'clearWatch'>>({
    coords: null,
    accuracy: null,
    ts: null,
    status: 'idle',
    hasPermission: undefined,
  });

  /* SSR guard – return inert object during static render */
  if (typeof window === 'undefined') {
    return {
      ...state,
      requestLocation: () => {},
      clearWatch: () => {},
    };
  }

  const watchId = useRef<number | null>(null);
  const lastFix = useRef<{ lat: number; lng: number } | null>(null);
  const debTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const asked = useRef(false);

  /* probe Permissions API once */
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      set(s => ({ ...s, status: 'error', error: 'Geolocation unsupported' }));
      return;
    }
    
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then(p => {
        set(s => ({ ...s, hasPermission: p.state === 'granted' }));
        // Auto-start if permission is granted OR prompt (to trigger permission dialog)
        if ((p.state === 'granted' || p.state === 'prompt') && o.watch) {
          trackLocationPermission(true, 'auto');
          requestLocation();
        }
        if (p.state === 'denied') {
          trackLocationPermission(false, 'auto');
        }
      }).catch(() => {
        // Fallback if permissions API fails - try anyway
        set(s => ({ ...s, hasPermission: undefined }));
        if (o.watch) {
          trackLocationPermission(true, 'fallback');
          requestLocation();
        }
      });
    } else {
      // No permissions API - try anyway
      if (o.watch) {
        trackLocationPermission(true, 'no-permissions-api');
        requestLocation();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* position handlers */
  const apply = useCallback((pos: GeolocationPosition) => {
    const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };

    if (
      lastFix.current &&
      o.minDistanceM > 0 &&
      haversine(lastFix.current, p) < o.minDistanceM
    ) return;

    if (debTimer.current) clearTimeout(debTimer.current);
    debTimer.current = setTimeout(() => {
      set(s => ({
        ...s,
        coords: p,
        accuracy: pos.coords.accuracy,
        ts: Date.now(),
        status: 'success',
        hasPermission: true,
      }));
      lastFix.current = p;
    }, o.debounceMs);
  }, [o.minDistanceM, o.debounceMs]);

  const fail = useCallback((err: GeolocationPositionError) => {
    const msg = {
      [err.PERMISSION_DENIED]: 'denied',
      [err.POSITION_UNAVAILABLE]: 'unavailable',
      [err.TIMEOUT]: 'timeout',
    }[err.code] ?? err.message;
    
    // Show user-friendly toast for timeout
    if (err.code === err.TIMEOUT) {
      toast.error('Location timeout', {
        description: 'Turn on GPS or try again'
      });
    }
    
    set(s => ({
      ...s,
      status: 'error',
      error: msg,
      hasPermission: err.code === err.PERMISSION_DENIED ? false : s.hasPermission,
    }));
  }, []);

  /* public API */
  const requestLocation = useCallback(() => {
    if (asked.current) return;
    asked.current = true;
    set(s => ({ ...s, status: 'loading' }));

    navigator.geolocation.getCurrentPosition(
      apply,
      fail,
      { enableHighAccuracy: o.enableHighAccuracy, timeout: 25000, maximumAge: 0 },
    );
    
    if (o.watch) {
      watchId.current = navigator.geolocation.watchPosition(
        apply,
        fail,
        { enableHighAccuracy: o.enableHighAccuracy, timeout: 25000, maximumAge: 60000 },
      );
    }
  }, [apply, fail, o.enableHighAccuracy, o.watch]);

  const clearWatch = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
    }
    if (debTimer.current) {
      clearTimeout(debTimer.current);
      debTimer.current = null;
    }
    watchId.current = null;
    asked.current = false;
  }, []);

  /* stop watch when tab hidden */
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        clearWatch();
      } else if (o.watch && state.status !== 'loading') {
        requestLocation();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [clearWatch, requestLocation, o.watch, state.status]);

  return { ...state, requestLocation, clearWatch };
}

// Convenience selectors for common use cases
export const useLatLng = () => useGeo({ watch: false }).coords;
export const useLocation = () => useGeo();

// Convenience hook that provides the same interface as useUserLocation's pos
export const useGeoPos = () => {
  const geo = useGeo();
  return {
    pos: geo.coords ? {
      lat: geo.coords.lat,
      lng: geo.coords.lng,
      accuracy: geo.accuracy || 0
    } : null,
    loading: geo.status === 'loading',
    error: geo.error,
    // Note: No tracking controls - use useUserLocation for that
  };
};