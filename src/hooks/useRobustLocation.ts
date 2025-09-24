import { useState, useEffect, useRef } from 'react';

interface LocationState {
  location: { lat: number; lng: number } | null;
  error: GeolocationPositionError | null;
  loading: boolean;
  hasPermission: boolean;
}

interface UseRobustLocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  retryDelay?: number;
  maxRetries?: number;
}

/**
 * Robust location hook that handles errors gracefully
 * and doesn't spam location requests
 */
export const useRobustLocation = (options: UseRobustLocationOptions = {}) => {
  const {
    enableHighAccuracy = false,
    timeout = 10000,
    maximumAge = 300000, // 5 minutes
    retryDelay = 5000,
    maxRetries = 3
  } = options;

  const [state, setState] = useState<LocationState>({
    location: null,
    error: null,
    loading: false,
    hasPermission: false,
  });

  const retryCountRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastRequestRef = useRef<number>(0);

  const requestLocation = () => {
    // Don't spam requests - minimum 30 seconds between requests
    const now = Date.now();
    if (now - lastRequestRef.current < 30000) {
      console.log('[useRobustLocation] Skipping request - too recent');
      return;
    }
    lastRequestRef.current = now;

    // Check if geolocation is available
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: {
          code: 2,
          message: 'Geolocation not supported',
        } as GeolocationPositionError,
        loading: false,
      }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('[useRobustLocation] ✅ Got location:', position.coords);
        setState({
          location: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          error: null,
          loading: false,
          hasPermission: true,
        });
        retryCountRef.current = 0;
      },
      (error) => {
        console.warn('[useRobustLocation] ❌ Location error:', {
          code: error.code,
          message: error.message,
        });

        setState(prev => ({
          ...prev,
          error,
          loading: false,
          hasPermission: error.code !== 1, // Not permission denied
        }));

        // Retry with exponential backoff, but only for certain errors
        if (error.code === 2 && retryCountRef.current < maxRetries) { // POSITION_UNAVAILABLE
          retryCountRef.current++;
          const delay = retryDelay * Math.pow(2, retryCountRef.current - 1);
          console.log(`[useRobustLocation] Retrying in ${delay}ms (attempt ${retryCountRef.current}/${maxRetries})`);
          
          timeoutRef.current = setTimeout(() => {
            requestLocation();
          }, delay);
        }
      },
      {
        enableHighAccuracy,
        timeout,
        maximumAge,
      }
    );
  };

  // Initial location request
  useEffect(() => {
    requestLocation();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []); // Only run once on mount

  return {
    ...state,
    requestLocation, // Allow manual refresh
  };
};