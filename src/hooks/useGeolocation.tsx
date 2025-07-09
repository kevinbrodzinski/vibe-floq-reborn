import { useState, useEffect } from 'react';

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

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation(prev => ({
        ...prev,
        loading: false,
        error: 'Geolocation not supported',
      }));
      return;
    }

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
      setLocation(prev => ({
        ...prev,
        loading: false,
        error: error.message,
      }));
    };

    // Get initial position
    navigator.geolocation.getCurrentPosition(successHandler, errorHandler, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000, // Cache for 1 minute
    });

    // Watch position changes
    const watchId = navigator.geolocation.watchPosition(
      successHandler,
      errorHandler,
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 30000, // Cache for 30 seconds
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return location;
};