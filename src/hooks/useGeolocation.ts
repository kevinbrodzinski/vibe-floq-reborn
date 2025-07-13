import { useState, useEffect } from 'react';

interface GeolocationState {
  lat: number | null;
  lng: number | null;
  coords: { lat: number; lng: number } | null;
  isLoading: boolean;
  loading: boolean; // Alias for compatibility
  error: string | null;
  hasPermission: boolean;
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  watch?: boolean;
}

export function useGeolocation(options: UseGeolocationOptions = {}) {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 60000,
    watch = false
  } = options;

  const [state, setState] = useState<GeolocationState>({
    lat: null,
    lng: null,
    coords: null,
    isLoading: true,
    loading: true,
    error: null,
    hasPermission: true
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setState({
        lat: null,
        lng: null,
        coords: null,
        isLoading: false,
        loading: false,
        error: 'Geolocation is not supported by this browser',
        hasPermission: false
      });
      return;
    }

    const handleSuccess = (position: GeolocationPosition) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      
      setState({
        lat,
        lng,
        coords: { lat, lng },
        isLoading: false,
        loading: false,
        error: null,
        hasPermission: true
      });
    };

    const handleError = (error: GeolocationPositionError) => {
      let errorMessage = 'Unable to retrieve location';
      
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = 'Location access denied by user';
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = 'Location information unavailable';
          break;
        case error.TIMEOUT:
          errorMessage = 'Location request timed out';
          break;
      }

      setState({
        lat: null,
        lng: null,
        coords: null,
        isLoading: false,
        loading: false,
        error: errorMessage,
        hasPermission: error.code !== error.PERMISSION_DENIED
      });
    };

    const geoOptions: PositionOptions = {
      enableHighAccuracy,
      timeout,
      maximumAge
    };

    let watchId: number | undefined;

    if (watch) {
      watchId = navigator.geolocation.watchPosition(
        handleSuccess,
        handleError,
        geoOptions
      );
    } else {
      navigator.geolocation.getCurrentPosition(
        handleSuccess,
        handleError,
        geoOptions
      );
    }

    return () => {
      if (watchId !== undefined) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [enableHighAccuracy, timeout, maximumAge, watch]);

  const requestLocation = () => {
    setState(prev => ({ ...prev, isLoading: true, loading: true, error: null }));
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        setState({
          lat,
          lng,
          coords: { lat, lng },
          isLoading: false,
          loading: false,
          error: null,
          hasPermission: true
        });
      },
      (error) => {
        setState({
          lat: null,
          lng: null,
          coords: null,
          isLoading: false,
          loading: false,
          error: error.message,
          hasPermission: error.code !== error.PERMISSION_DENIED
        });
      },
      { enableHighAccuracy, timeout, maximumAge }
    );
  };

  return {
    ...state,
    refetch: requestLocation,
    requestLocation
  };
}