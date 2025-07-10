import { useState, useEffect, useCallback, useRef } from 'react';

interface GeolocationState {
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  loading: boolean;
  error: string | null;
}

const POSITION_UPDATE_THRESHOLD = 10; // meters
const DEBOUNCE_DELAY = 2000; // 2 seconds

export const useOptimizedGeolocation = () => {
  const [location, setLocation] = useState<GeolocationState>({
    lat: null,
    lng: null,
    accuracy: null,
    loading: true,
    error: null,
  });

  const lastPosition = useRef<{ lat: number; lng: number } | null>(null);
  const watchId = useRef<number | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const calculateDistance = useCallback((lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lng2-lng1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  }, []);

  const updateLocation = useCallback((position: GeolocationPosition) => {
    const newLat = position.coords.latitude;
    const newLng = position.coords.longitude;

    // Check if we've moved significantly
    if (lastPosition.current) {
      const distance = calculateDistance(
        lastPosition.current.lat, 
        lastPosition.current.lng, 
        newLat, 
        newLng
      );
      
      if (distance < POSITION_UPDATE_THRESHOLD) {
        return; // Don't update if movement is too small
      }
    }

    // Debounce updates
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      setLocation({
        lat: newLat,
        lng: newLng,
        accuracy: position.coords.accuracy,
        loading: false,
        error: null,
      });

      lastPosition.current = { lat: newLat, lng: newLng };
    }, DEBOUNCE_DELAY);
  }, [calculateDistance]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation(prev => ({
        ...prev,
        loading: false,
        error: 'Geolocation not supported',
      }));
      return;
    }

    const errorHandler = (error: GeolocationPositionError) => {
      setLocation(prev => ({
        ...prev,
        loading: false,
        error: error.message,
      }));
    };

    // Get initial position with higher timeout for first fix
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          loading: false,
          error: null,
        });
        lastPosition.current = { 
          lat: position.coords.latitude, 
          lng: position.coords.longitude 
        };
      },
      errorHandler,
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 300000, // 5 minutes cache for initial position
      }
    );

    // Watch position with optimized settings
    watchId.current = navigator.geolocation.watchPosition(
      updateLocation,
      errorHandler,
      {
        enableHighAccuracy: false, // Use less battery for watching
        timeout: 8000,
        maximumAge: 60000, // 1 minute cache
      }
    );

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [updateLocation]);

  return location;
};