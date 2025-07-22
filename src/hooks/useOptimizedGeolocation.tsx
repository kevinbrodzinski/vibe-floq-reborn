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
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debug location override from localStorage
  const getDebugLocation = useCallback(() => {
    const debugLoc = localStorage.getItem('floq-debug-forceLoc');
    if (debugLoc) {
      const [lat, lng] = debugLoc.split(',').map(Number);
      if (!isNaN(lat) && !isNaN(lng)) {
        console.log('[DEBUG] Using forced location:', { lat, lng });
        return { lat, lng };
      }
    }
    return null;
  }, []);

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
    // Check for debug location override first
    const debugLoc = getDebugLocation();
    if (debugLoc) {
      setLocation({
        lat: debugLoc.lat,
        lng: debugLoc.lng,
        accuracy: 10, // Fake high accuracy for debug
        loading: false,
        error: null,
      });
      lastPosition.current = debugLoc;
      return;
    }

    if (!navigator.geolocation) {
      setLocation(prev => ({
        ...prev,
        loading: false,
        error: 'Geolocation not supported',
      }));
      return;
    }

    const errorHandler = (error: GeolocationPositionError) => {
      console.log('[GEOLOCATION] Error:', error.message, 'Code:', error.code);
      setLocation(prev => ({
        ...prev,
        loading: false,
        error: error.message,
      }));
    };

    console.log('[GEOLOCATION] Requesting initial position...');
    
    // Get initial position with higher timeout for first fix
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('[GEOLOCATION] Got initial position:', {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
        
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
  }, [updateLocation, getDebugLocation]);

  return location;
};