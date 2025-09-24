// Smart user location hook with movement gating and battery efficiency
// Only emits location updates when user has moved significantly

import { useEffect, useRef, useState, useCallback } from 'react';
import { calculateDistance as calculateDistanceMeters } from '@/lib/location/standardGeo';
import { incrAura } from '@/lib/telemetry';

export type LocationState = {
  lat: number | null;
  lng: number | null;
  accuracyM?: number | null;
  permission: 'granted' | 'denied' | 'prompt' | 'unknown';
  watching: boolean;
  lastUpdate: number | null;
};

type Opts = {
  /** Ignore micro-moves; default 120m */
  minMoveM?: number;
  /** Minimum time between emits; default 10s */
  minIntervalMs?: number;
  /** Set true if you need high-accuracy; default false */
  highAccuracy?: boolean;
};

export function useUserLocation(opts: Opts = {}) {
  const { minMoveM = 120, minIntervalMs = 10_000, highAccuracy = false } = opts;

  const [state, setState] = useState<LocationState>({
    lat: null, 
    lng: null, 
    accuracyM: null,
    permission: 'unknown', 
    watching: false, 
    lastUpdate: null,
  });

  const watchIdRef = useRef<number | null>(null);
  const lastEmitRef = useRef<{lat: number; lng: number; t: number} | null>(null);

  const stop = useCallback(() => {
    if (watchIdRef.current != null) {
      try { 
        navigator.geolocation.clearWatch(watchIdRef.current); 
      } catch {}
      watchIdRef.current = null;
      incrAura('watchStops');
    }
    setState(s => ({ ...s, watching: false }));
  }, []);

  const start = useCallback(() => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return;

    // Permission probe (best effort)
    const setPerm = (p: PermissionState | 'unknown') =>
      setState(s => ({ ...s, permission: p as LocationState['permission'] }));

    try {
      // Not all browsers support Permissions API
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (navigator as any).permissions?.query({ name: 'geolocation' as PermissionName })
        .then((res: { state: PermissionState }) => setPerm(res.state))
        .catch(() => setPerm('unknown'));
    } catch { 
      setPerm('unknown'); 
    }

    if (watchIdRef.current != null) return; // already watching

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const acc = pos.coords.accuracy ?? null;
        const now = Date.now();

        const last = lastEmitRef.current;
        const moved = !last || calculateDistanceMeters(
          { lat: last.lat, lng: last.lng }, 
          { lat, lng }
        ) > minMoveM;
        const timeOk = !last || (now - last.t) > minIntervalMs;

        // Always emit first reading
        if (!last) {
          lastEmitRef.current = { lat, lng, t: now };
          setState(s => ({ 
            ...s, 
            lat, 
            lng, 
            accuracyM: acc, 
            lastUpdate: now, 
            watching: true 
          }));
          return;
        }

        // Emit if moved enough or enough time passed
        if (moved || timeOk) {
          lastEmitRef.current = { lat, lng, t: now };
          setState(s => ({ 
            ...s, 
            lat, 
            lng, 
            accuracyM: acc, 
            lastUpdate: now, 
            watching: true 
          }));
        }
      },
      (error) => {
        // Handle permission denied
        if (error.code === error.PERMISSION_DENIED) {
          setState(s => ({ ...s, permission: 'denied' }));
          incrAura('permissionDenied');
          stop(); // stop watcher to save battery
        }
        // Ignore other errors to keep silent UX
      },
      {
        enableHighAccuracy: highAccuracy,
        maximumAge: 30_000,
        timeout: 6_000,
      }
    );
    
    watchIdRef.current = id;
    setState(s => ({ ...s, watching: true }));
    incrAura('watchStarts');
  }, [highAccuracy, minMoveM, minIntervalMs]);

  useEffect(() => {
    start();
    return stop;
  }, [start, stop]);

  return { ...state, start, stop };
}
