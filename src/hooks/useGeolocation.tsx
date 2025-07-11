import { useState, useEffect, useRef, useCallback } from 'react';

interface GeolocationState {
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  loading: boolean;
  error: string | null;
  hasPermission: boolean;
}

export const useGeolocation = () => {
  const [location, setLocation] = useState<GeolocationState>({
    lat: null,
    lng: null,
    accuracy: null,
    loading: false, // Start as false, require user gesture
    error: null,
    hasPermission: false,
  });
  
  const permissionChecked = useRef(false);
  const watchIdRef = useRef<number | null>(null);

  // Check permission status without requesting location
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation(prev => ({
        ...prev,
        error: 'Geolocation not supported',
      }));
      return;
    }

    // Check if we have permission without triggering a request
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then(result => {
        setLocation(prev => ({
          ...prev,
          hasPermission: result.state === 'granted',
        }));
      }).catch(() => {
        // Fallback - permission API not supported
        setLocation(prev => ({ ...prev, hasPermission: false }));
      });
    }
  }, []);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocation(prev => ({
        ...prev,
        error: 'Geolocation not supported',
      }));
      return;
    }

    // Prevent multiple simultaneous requests
    if (permissionChecked.current) {
      return;
    }
    permissionChecked.current = true;

    setLocation(prev => ({ ...prev, loading: true, error: null }));

    const successHandler = (position: GeolocationPosition) => {
      setLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        loading: false,
        error: null,
        hasPermission: true,
      });
      permissionChecked.current = false; // Allow future requests
    };

    const errorHandler = (error: GeolocationPositionError) => {
      let errorMessage = 'Location access denied';
      if (error.code === error.PERMISSION_DENIED) {
        errorMessage = 'Location permission denied';
      } else if (error.code === error.POSITION_UNAVAILABLE) {
        errorMessage = 'Location unavailable';
      } else if (error.code === error.TIMEOUT) {
        errorMessage = 'Location request timeout';
      }
      
      setLocation(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
        hasPermission: error.code !== error.PERMISSION_DENIED,
      }));
      permissionChecked.current = false; // Allow future requests
    };

    // Get initial position with safer options
    navigator.geolocation.getCurrentPosition(successHandler, errorHandler, {
      enableHighAccuracy: false,
      timeout: 8000,
      maximumAge: 300000, // 5 minutes cache
    });
  }, []);

  const clearWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  return {
    ...location,
    requestLocation,
    clearWatch,
  };
};