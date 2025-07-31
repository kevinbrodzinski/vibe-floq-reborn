/**
 * Core GPS location hook - handles raw GPS coordinates only
 * This is the foundational layer that other location hooks build upon
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { calculateDistance, type GPS } from '@/lib/location/standardGeo';
import { trackLocationPermission } from '@/lib/analytics';
import { toast } from 'sonner';

export interface LocationCoreOptions {
  enableHighAccuracy?: boolean;
  watch?: boolean;
  /** ignore updates closer than N metres (0 = every update) */
  minDistanceM?: number;
  /** debounce successive updates (ms) */
  debounceMs?: number;
}

export interface LocationCoreState {
  coords: GPS | null;
  accuracy: number | null;
  timestamp: number | null;
  status: 'idle' | 'loading' | 'success' | 'error';
  error?: string;
  hasPermission?: boolean;
}

const DEFAULT_OPTIONS: Required<LocationCoreOptions> = {
  enableHighAccuracy: true,
  watch: true,
  minDistanceM: 10,
  debounceMs: 2000,
};

/**
 * Core GPS location hook - pure geolocation without any tracking/sharing logic
 */
export function useLocationCore(options: LocationCoreOptions = {}): LocationCoreState & {
  requestLocation: () => void;
  clearWatch: () => void;
} {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const [state, setState] = useState<LocationCoreState>({
    coords: null,
    accuracy: null,
    timestamp: null,
    status: 'idle',
    hasPermission: undefined,
  });

  // SSR guard
  if (typeof window === 'undefined') {
    return {
      ...state,
      requestLocation: () => {},
      clearWatch: () => {},
    };
  }

  const watchId = useRef<number | null>(null);
  const lastFix = useRef<GPS | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userGestureRef = useRef(false);

  // Permission check on mount
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setState(s => ({ ...s, status: 'error', error: 'Geolocation unsupported' }));
      return;
    }

    // Check cached coordinates first
    const cached = sessionStorage.getItem('floq-coords');
    if (cached) {
      try {
        const coords = JSON.parse(cached);
        setState(s => ({
          ...s,
          coords,
          status: 'success',
          hasPermission: true,
          timestamp: Date.now(),
        }));
        lastFix.current = coords;
        return;
      } catch {
        sessionStorage.removeItem('floq-coords');
      }
    }

    const handleGranted = () => {
      setState(s => ({ ...s, hasPermission: true }));
      if (opts.watch) {
        trackLocationPermission(true, 'auto-granted');
        requestLocation();
      }
    };

    const handleDenied = () => {
      setState(s => ({ ...s, hasPermission: false }));
      trackLocationPermission(false, 'auto');
    };

    const checkPermissions = async () => {
      try {
        if ('permissions' in navigator) {
          const permission = await navigator.permissions.query({ name: 'geolocation' });
          
          if (permission.state === 'granted') handleGranted();
          else if (permission.state === 'denied') handleDenied();
          else setState(s => ({ ...s, hasPermission: undefined }));

          permission.onchange = () => {
            if (permission.state === 'granted') handleGranted();
            else if (permission.state === 'denied') handleDenied();
            else setState(s => ({ ...s, hasPermission: undefined }));
          };
        } else {
          setState(s => ({ ...s, hasPermission: undefined }));
        }
      } catch {
        setState(s => ({ ...s, hasPermission: undefined }));
      }
    };

    checkPermissions();
  }, []);

  // Handle position updates
  const handlePosition = useCallback(
    (position: GeolocationPosition) => {
      const newCoords: GPS = { 
        lat: position.coords.latitude, 
        lng: position.coords.longitude 
      };

      // Distance gate
      if (
        lastFix.current &&
        opts.minDistanceM > 0 &&
        calculateDistance(lastFix.current, newCoords) < opts.minDistanceM
      ) {
        return;
      }

      // Debounce and update
      if (debounceTimer.current) clearTimeout(debounceTimer.current);

      debounceTimer.current = setTimeout(() => {
        setState(s => ({
          ...s,
          coords: newCoords,
          accuracy: position.coords.accuracy,
          timestamp: Date.now(),
          status: 'success',
          hasPermission: true,
        }));
        lastFix.current = newCoords;
        
        // Cache coordinates
        try {
          sessionStorage.setItem('floq-coords', JSON.stringify(newCoords));
        } catch {
          // Ignore storage errors
        }
      }, opts.debounceMs);
    },
    [opts.minDistanceM, opts.debounceMs],
  );

  const handleError = useCallback((error: GeolocationPositionError) => {
    const message = {
      [error.PERMISSION_DENIED]: 'denied',
      [error.POSITION_UNAVAILABLE]: 'unavailable',
      [error.TIMEOUT]: 'timeout',
    }[error.code] ?? error.message;

    if (error.code === error.TIMEOUT) {
      toast.error('Location timeout', {
        description: 'Turn on GPS or try again',
      });
    }

    setState(s => ({
      ...s,
      status: 'error',
      error: message,
      hasPermission: error.code === error.PERMISSION_DENIED ? false : s.hasPermission,
    }));
  }, []);

  const requestLocation = useCallback(() => {
    if (userGestureRef.current) return;
    userGestureRef.current = true;

    setState(s => ({ ...s, status: 'loading' }));

    navigator.geolocation.getCurrentPosition(
      handlePosition,
      handleError,
      { 
        enableHighAccuracy: opts.enableHighAccuracy, 
        timeout: 25_000, 
        maximumAge: 0 
      },
    );

    if (opts.watch) {
      watchId.current = navigator.geolocation.watchPosition(
        handlePosition,
        handleError,
        { 
          enableHighAccuracy: opts.enableHighAccuracy, 
          timeout: 25_000, 
          maximumAge: 60_000 
        },
      );
    }
  }, [handlePosition, handleError, opts.enableHighAccuracy, opts.watch]);

  const clearWatch = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
    }
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
    watchId.current = null;
    userGestureRef.current = false;
  }, []);

  // Handle visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        clearWatch();
      } else if (opts.watch && state.status !== 'loading') {
        requestLocation();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [clearWatch, requestLocation, opts.watch, state.status]);

  return { ...state, requestLocation, clearWatch };
}