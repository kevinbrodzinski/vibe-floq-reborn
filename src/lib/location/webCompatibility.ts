
interface CompatibilityGeolocationCoordinates extends GeolocationCoordinates {
  toJSON(): object;
}

interface CompatibilityGeolocationPosition extends GeolocationPosition {
  coords: CompatibilityGeolocationCoordinates;
  toJSON(): object;
}

export function createCompatiblePosition(
  latitude: number,
  longitude: number,
  accuracy = 50
): CompatibilityGeolocationPosition {
  const coords: CompatibilityGeolocationCoordinates = {
    latitude,
    longitude,
    accuracy,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
    toJSON() {
      return {
        latitude: this.latitude,
        longitude: this.longitude,
        accuracy: this.accuracy,
        altitude: this.altitude,
        altitudeAccuracy: this.altitudeAccuracy,
        heading: this.heading,
        speed: this.speed,
      };
    }
  };

  return {
    coords,
    timestamp: Date.now(),
    toJSON() {
      return {
        coords: this.coords.toJSON(),
        timestamp: this.timestamp,
      };
    }
  };
}

/* ------------------------------------------------------------------ */
/*  Browser-only helpers                                              */
/* ------------------------------------------------------------------ */

export interface EnhancedGeoResult {
  coords: GeolocationCoordinates | null;
  timestamp: number | null;
  status: 'idle' | 'fetching' | 'success' | 'error' | 'debug';
  error?: GeolocationPositionError;
}

/**
 * Promise wrapper that returns a richer object + abort-timeout.
 */
export const getEnhancedGeolocation = (
  opts: PositionOptions = { enableHighAccuracy: true, timeout: 10000 }
): Promise<EnhancedGeoResult> =>
  new Promise((resolve) => {
    if (!('geolocation' in navigator)) {
      return resolve({ coords: null, timestamp: null, status: 'error' });
    }

    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          coords: pos.coords,
          timestamp: pos.timestamp,
          status: 'success',
        }),
      (error) =>
        resolve({
          coords: null,
          timestamp: Date.now(),
          status: 'error',
          error // Pass the error object so we can check error.code
        }),
      opts
    );
  });

export function getLocationWithTimeout(
  timeout = 10000
): Promise<CompatibilityGeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported'));
      return;
    }

    let timeoutId: number | null = null;
    let watchId: number | null = null;

    const cleanup = () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
    };

    timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error('Location request timed out'));
    }, timeout);

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        cleanup();
        const compatiblePosition = createCompatiblePosition(
          position.coords.latitude,
          position.coords.longitude,
          position.coords.accuracy
        );
        resolve(compatiblePosition);
      },
      (error) => {
        cleanup();
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout,
        maximumAge: 30000,
      }
    );
  });
}

/* Optional small helpers the old code referenced ------------------- */
export const webLocationHelpers = {
  metersToMiles: (m: number) => m * 0.000621371,
  isSupported: () => 'geolocation' in navigator,
  isLocationAvailable: () => 'geolocation' in navigator,
  checkPermission: async () => {
    if ('permissions' in navigator) {
      const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      return result.state;
    }
    return 'prompt';
  },
  toLatLng: (pos: GeolocationPosition) => ({
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    accuracy: pos.coords.accuracy,
  }),
};
