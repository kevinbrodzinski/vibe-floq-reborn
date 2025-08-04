/**
 * LocationBus - Singleton GPS manager to prevent multiple watchPosition calls
 * 
 * Phase 1 of location system optimization:
 * - Single watchPosition for entire app
 * - Pub-sub pattern for location updates  
 * - Battery-friendly with proper error handling
 */

type LocationCallback = (position: GeolocationPosition | null) => void;
type ErrorCallback = (error: GeolocationPositionError) => void;

interface LocationSubscription {
  onLocation: LocationCallback;
  onError?: ErrorCallback;
  id: string;
}

class LocationBus {
  private subscriptions = new Map<string, LocationSubscription>();
  private watchId: number | null = null;
  private lastPosition: GeolocationPosition | null = null;
  private lastError: GeolocationPositionError | null = null;
  private isActive = false;

  /**
   * Subscribe to location updates
   * @param onLocation - Callback for position updates
   * @param onError - Optional error callback
   * @returns Unsubscribe function
   */
  subscribe(onLocation: LocationCallback, onError?: ErrorCallback): () => void {
    const id = Math.random().toString(36).slice(2);
    
    this.subscriptions.set(id, { onLocation, onError, id });
    
    // Start watching if this is the first subscription
    if (!this.isActive) {
      this.startWatching();
    }
    
    // Send last known position immediately if available
    if (this.lastPosition) {
      onLocation(this.lastPosition);
    } else if (this.lastError && onError) {
      onError(this.lastError);
    }

    // Return unsubscribe function
    return () => {
      this.subscriptions.delete(id);
      
      // Stop watching if no more subscriptions
      if (this.subscriptions.size === 0) {
        this.stopWatching();
      }
    };
  }

  /**
   * Get current position (one-time request)
   */
  async getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (this.lastPosition) {
        resolve(this.lastPosition);
        return;
      }

      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000
      });
    });
  }

  /**
   * Start GPS watching (internal method)
   */
  private startWatching() {
    if (this.isActive || !navigator.geolocation) return;

    console.log('[LocationBus] Starting GPS watch');
    this.isActive = true;

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        this.lastPosition = position;
        this.lastError = null;
        
        // Notify all subscribers
        this.subscriptions.forEach(({ onLocation }) => {
          try {
            onLocation(position);
          } catch (error) {
            console.warn('[LocationBus] Subscriber callback error:', error);
          }
        });
      },
      (error) => {
        this.lastError = error;
        console.warn('[LocationBus] GPS error:', error);
        
        // Notify subscribers with error callbacks
        this.subscriptions.forEach(({ onError }) => {
          if (onError) {
            try {
              onError(error);
            } catch (callbackError) {
              console.warn('[LocationBus] Error callback failed:', callbackError);
            }
          }
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 10000
      }
    );
  }

  /**
   * Stop GPS watching (internal method)
   */
  private stopWatching() {
    if (!this.isActive) return;

    console.log('[LocationBus] Stopping GPS watch');
    
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    
    this.isActive = false;
  }

  /**
   * Get current subscription count (for debugging)
   */
  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  /**
   * Force refresh location (useful for debugging)
   */
  refresh() {
    if (this.isActive) {
      this.stopWatching();
      this.startWatching();
    }
  }
}

// Export singleton instance
export const locationBus = new LocationBus();

// Export hook for easy React integration
export function useLocationBus() {
  return locationBus;
}