
import { trackError } from '@/lib/trackError';

interface LocationCoords {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp?: number;
}

type LocationCallback = (coords: LocationCoords) => void;
type ErrorCallback = (error: string) => void;

class GlobalLocationManager {
  private subscribers = new Map<string, { 
    callback: LocationCallback; 
    errorCallback?: ErrorCallback; 
  }>();
  private currentLocation: LocationCoords | null = null;
  private watchId: number | null = null;
  private retryTimeout: number | null = null;

  subscribe(
    id: string, 
    callback: LocationCallback, 
    errorCallback?: ErrorCallback
  ): () => void {
    this.subscribers.set(id, { callback, errorCallback });
    
    // Start watching if first subscriber
    if (this.subscribers.size === 1) {
      this.startWatching();
    }
    
    // Send current location if available
    if (this.currentLocation) {
      callback(this.currentLocation);
    }
    
    return () => {
      this.subscribers.delete(id);
      if (this.subscribers.size === 0) {
        this.stopWatching();
      }
    };
  }

  private startWatching() {
    if (!navigator.geolocation) {
      this.notifyError('Geolocation is not supported');
      return;
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000,
    };

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const coords: LocationCoords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        };
        
        this.currentLocation = coords;
        this.notifySubscribers(coords);
      },
      (error) => {
        console.error('Geolocation error:', error);
        this.retryTimeout = window.setTimeout(() => {
          this.notifyError(error.message);
        }, 5000);
      },
      options
    );
  }

  private stopWatching() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    
    if (this.retryTimeout !== null) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
  }

  private notifySubscribers(coords: LocationCoords) {
    this.subscribers.forEach(({ callback }) => {
      try {
        callback(coords);
      } catch (error) {
        console.error('Error in location callback:', error);
        trackError(error as Error, { context: 'location_callback' });
      }
    });
  }

  private notifyError(message: string) {
    this.subscribers.forEach(({ errorCallback }) => {
      if (errorCallback) {
        try {
          errorCallback(message);
        } catch (error) {
          console.error('Error in location error callback:', error);
        }
      }
    });
  }

  getCurrentLocation(): LocationCoords | null {
    return this.currentLocation;
  }
}

export const globalLocationManager = new GlobalLocationManager();
