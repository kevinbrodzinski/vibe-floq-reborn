/**
 * Standardized error handling for location operations
 */
import { toast } from 'sonner';

export type LocationErrorType = 
  | 'permission_denied'
  | 'position_unavailable' 
  | 'timeout'
  | 'network_error'
  | 'privacy_blocked'
  | 'unsupported'
  | 'unknown';

export interface LocationError {
  type: LocationErrorType;
  message: string;
  originalError?: Error;
  recoverable: boolean;
  userMessage: string;
}

/**
 * Standardize geolocation errors with user-friendly messages
 */
export function normalizeLocationError(error: GeolocationPositionError | Error | unknown): LocationError {
  if (error && typeof error === 'object' && 'code' in error) {
    // This is a GeolocationPositionError
    const geoError = error as GeolocationPositionError;
    switch (geoError.code) {
      case 1: // PERMISSION_DENIED
        return {
          type: 'permission_denied',
          message: 'Location permission denied',
          originalError: new Error(geoError.message),
          recoverable: true,
          userMessage: 'Please enable location access in your browser settings to use this feature.'
        };
      
      case 2: // POSITION_UNAVAILABLE
        return {
          type: 'position_unavailable',
          message: 'Location unavailable',
          originalError: new Error(geoError.message),
          recoverable: true,
          userMessage: 'Unable to determine your location. Please check your GPS and try again.'
        };
      
      case 3: // TIMEOUT
        return {
          type: 'timeout',
          message: 'Location request timed out',
          originalError: new Error(geoError.message),
          recoverable: true,
          userMessage: 'Location request timed out. Please ensure GPS is enabled and try again.'
        };
      
      default:
        return {
          type: 'unknown',
          message: geoError.message || 'Unknown location error',
          originalError: new Error(geoError.message),
          recoverable: false,
          userMessage: 'An unexpected location error occurred. Please try again.'
        };
    }
  }

  if (error instanceof Error) {
    // Network or other errors
    if (error.name === 'AbortError') {
      return {
        type: 'timeout',
        message: 'Location request was cancelled',
        originalError: error,
        recoverable: true,
        userMessage: 'Location request was cancelled. Please try again.'
      };
    }

    return {
      type: 'network_error',
      message: error.message,
      originalError: error,
      recoverable: true,
      userMessage: 'Network error while getting location. Please check your connection.'
    };
  }

  // Unknown error type
  return {
    type: 'unknown',
    message: String(error),
    recoverable: false,
    userMessage: 'An unexpected error occurred. Please try again.'
  };
}

/**
 * Show appropriate user feedback for location errors
 */
export function handleLocationError(error: LocationError, showToast = true) {
  console.error(`[LocationError] ${error.type}: ${error.message}`, error.originalError);

  if (showToast) {
    if (error.recoverable) {
      toast.error('Location Error', {
        description: error.userMessage,
        action: error.type === 'permission_denied' ? {
          label: 'Learn More',
          onClick: () => {
            // Could open help documentation
            console.log('Show location permission help');
          }
        } : undefined
      });
    } else {
      toast.error('Location Unavailable', {
        description: error.userMessage,
      });
    }
  }

  return error;
}

/**
 * Helper to wrap location operations with error handling
 */
export async function withLocationErrorHandling<T>(
  operation: () => Promise<T>,
  context = 'location operation'
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    const locationError = normalizeLocationError(error);
    handleLocationError(locationError);
    return null;
  }
}

/**
 * Check if browser supports geolocation with helpful error
 */
export function checkGeolocationSupport(): LocationError | null {
  if (!('geolocation' in navigator)) {
    return {
      type: 'unsupported',
      message: 'Geolocation not supported',
      recoverable: false,
      userMessage: 'Your browser does not support location services. Please use a modern browser.'
    };
  }

  if (!window.isSecureContext) {
    return {
      type: 'unsupported',
      message: 'Geolocation requires secure context',
      recoverable: false,
      userMessage: 'Location services require a secure connection (HTTPS). Please use a secure connection.'
    };
  }

  return null;
}