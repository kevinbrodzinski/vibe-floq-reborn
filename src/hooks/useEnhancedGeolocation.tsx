import { useState, useEffect, useRef, useCallback } from 'react';
import { trackLocationPermission } from '@/lib/analytics';

interface GeolocationState {
  coords: { lat: number; lng: number } | null;
  accuracy: number | null;
  loading: boolean;
  error: string | null;
  hasPermission: boolean;
  permissionDenied: boolean;
  isSupported: boolean;
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

const initialState: GeolocationState = {
  coords: null,
  accuracy: null,
  loading: false,
  error: null,
  hasPermission: false,
  permissionDenied: false,
  isSupported: 'geolocation' in navigator,
};

export function useEnhancedGeolocation(options: UseGeolocationOptions = {}) {
  const [location, setLocation] = useState<GeolocationState>(initialState);
  const permissionChecked = useRef(false);
  const watchIdRef = useRef<number | null>(null);

  // Check permission status
  useEffect(() => {
    const checkPermission = async () => {
      if (!location.isSupported) {
        setLocation(prev => ({ 
          ...prev, 
          error: 'Geolocation is not supported by this browser',
          permissionDenied: true 
        }));
        return;
      }

      try {
        if ('permissions' in navigator) {
          const permission = await navigator.permissions.query({ name: 'geolocation' });
          const hasPermission = permission.state === 'granted';
          const permissionDenied = permission.state === 'denied';
          
          setLocation(prev => ({ 
            ...prev, 
            hasPermission,
            permissionDenied 
          }));

          // Track initial permission state
          if (permission.state !== 'prompt') {
            trackLocationPermission(hasPermission, 'automatic');
          }

          // Listen for permission changes
          permission.addEventListener('change', () => {
            const newHasPermission = permission.state === 'granted';
            const newPermissionDenied = permission.state === 'denied';
            
            setLocation(prev => ({ 
              ...prev, 
              hasPermission: newHasPermission,
              permissionDenied: newPermissionDenied 
            }));
          });
        }
      } catch (error) {
        console.warn('Permission API not available:', error);
        setLocation(prev => ({ ...prev, hasPermission: false }));
      }
    };

    checkPermission();
  }, [location.isSupported]);

  const requestLocation = useCallback(() => {
    if (!location.isSupported) {
      setLocation(prev => ({ 
        ...prev, 
        error: 'Geolocation is not supported by this browser',
        permissionDenied: true 
      }));
      return;
    }

    // Prevent multiple simultaneous requests
    if (permissionChecked.current) {
      return;
    }
    permissionChecked.current = true;

    setLocation(prev => ({ ...prev, loading: true, error: null }));

    const handleSuccess = (position: GeolocationPosition) => {
      console.info('[GEOLOCATION] Got position:', {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy
      });

      setLocation(prev => ({
        ...prev,
        coords: {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        },
        accuracy: position.coords.accuracy,
        loading: false,
        error: null,
        hasPermission: true,
        permissionDenied: false,
      }));

      permissionChecked.current = false;

      // Track successful permission grant
      trackLocationPermission(true, 'manual');

      // Auto-refresh location if tab is visible (every 30 seconds)
      if (!document.hidden) {
        setTimeout(() => {
          if (!document.hidden) {
            requestLocation();
          }
        }, 30000);
      }
    };

    const handleError = (error: GeolocationPositionError) => {
      console.warn('[GEOLOCATION] Error:', error.message);
      
      let errorMessage: string;
      let permissionDenied = false;
      
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = 'Location access denied. Please enable location permissions in your browser settings to see nearby flocks.';
          permissionDenied = true;
          trackLocationPermission(false, 'manual');
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = 'Location information is unavailable. Please check your device GPS settings.';
          break;
        case error.TIMEOUT:
          errorMessage = 'Location request timed out. Please try again or check your connection.';
          break;
        default:
          errorMessage = 'An unknown error occurred while retrieving location.';
          break;
      }

      setLocation(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
        permissionDenied,
      }));

      permissionChecked.current = false;
    };

    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      handleError,
      {
        enableHighAccuracy: options.enableHighAccuracy ?? true,
        timeout: options.timeout ?? 15000,
        maximumAge: options.maximumAge ?? 60000,
        ...options,
      }
    );
  }, [options, location.isSupported]);

  const clearWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  // Auto-request location on mount if permission is already granted
  useEffect(() => {
    if (location.hasPermission && !location.coords && !location.loading && !permissionChecked.current) {
      console.info('[GEOLOCATION] Auto-requesting location (permission granted)');
      requestLocation();
    }
  }, [location.hasPermission, location.coords, location.loading, requestLocation]);

  return {
    ...location,
    requestLocation,
    clearWatch,
  };
}