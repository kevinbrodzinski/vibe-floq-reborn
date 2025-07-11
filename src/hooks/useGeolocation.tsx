import { useState, useEffect, useRef } from 'react';

interface GeolocationState {
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  loading: boolean;
  error: string | null;
}

export const useGeolocation = () => {
  const [location, setLocation] = useState<GeolocationState>({
    lat: null,
    lng: null,
    accuracy: null,
    loading: true,
    error: null,
  });
  
  const permissionChecked = useRef(false);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation(prev => ({
        ...prev,
        loading: false,
        error: 'Geolocation not supported',
      }));
      return;
    }

    // Prevent multiple permission requests
    if (permissionChecked.current) {
      return;
    }
    permissionChecked.current = true;

    const successHandler = (position: GeolocationPosition) => {
      setLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        loading: false,
        error: null,
      });
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
      }));
    };

    // Get initial position with safer options
    navigator.geolocation.getCurrentPosition(successHandler, errorHandler, {
      enableHighAccuracy: false,
      timeout: 8000,
      maximumAge: 300000, // 5 minutes cache
    });

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  return location;
};