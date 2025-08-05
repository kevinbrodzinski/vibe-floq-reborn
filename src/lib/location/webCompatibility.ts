
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

export function getEnhancedGeolocation() {
  if (!navigator.geolocation) {
    throw new Error('Geolocation not supported');
  }
  return navigator.geolocation;
}

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

export const webLocationHelpers = {
  isSupported: () => 'geolocation' in navigator,
  checkPermission: async () => {
    if ('permissions' in navigator) {
      const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      return result.state;
    }
    return 'prompt';
  }
};
