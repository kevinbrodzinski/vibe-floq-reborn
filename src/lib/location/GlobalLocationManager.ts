/**
 * Global Location Manager - Coordinates all GPS requests across the app
 * Prevents multiple watchPosition calls and provides centralized location data
 */

interface LocationSubscriber {
  id: string;
  callback: (position: GeolocationPosition) => void;
  errorCallback?: (error: GeolocationPositionError) => void;
  options?: PositionOptions;
}

interface LocationData {
  position: GeolocationPosition;
  timestamp: number;
}

class GlobalLocationManager {
  private watchId: number | null = null;
  private subscribers: Map<string, LocationSubscriber> = new Map();
  private lastPosition: LocationData | null = null;
  private isWatching = false;
  private hasPermission = false;
  
  // Circuit breaker for GPS failures
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly MAX_FAILURES = 5;
  private readonly FAILURE_RESET_TIME = 5 * 60 * 1000; // 5 minutes
  
  private static instance: GlobalLocationManager | null = null;
  
  static getInstance(): GlobalLocationManager {
    if (!GlobalLocationManager.instance) {
      GlobalLocationManager.instance = new GlobalLocationManager();
    }
    return GlobalLocationManager.instance;
  }
  
  private constructor() {
    // Check permission on initialization
    this.checkPermission();
  }
  
  private async checkPermission(): Promise<boolean> {
    if (!navigator.geolocation) {
      console.warn('[GlobalLocationManager] Geolocation not supported');
      return false;
    }
    
    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      this.hasPermission = result.state === 'granted';
      return this.hasPermission;
    } catch (error) {
      console.warn('[GlobalLocationManager] Permission check failed:', error);
      return false;
    }
  }
  
  private shouldSkipDueToFailures(): boolean {
    const now = Date.now();
    if (this.failureCount >= this.MAX_FAILURES) {
      if (now - this.lastFailureTime < this.FAILURE_RESET_TIME) {
        return true; // Still in failure timeout period
      } else {
        // Reset failure count after timeout
        this.failureCount = 0;
      }
    }
    return false;
  }
  
  private handleSuccess = (position: GeolocationPosition) => {
    // Reset failure count on success
    this.failureCount = 0;
    
    this.lastPosition = {
      position,
      timestamp: Date.now()
    };
    
    // Notify all subscribers
    this.subscribers.forEach(subscriber => {
      try {
        subscriber.callback(position);
      } catch (error) {
        console.error(`[GlobalLocationManager] Subscriber ${subscriber.id} callback failed:`, error);
      }
    });
  };
  
  private handleError = (error: GeolocationPositionError) => {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    console.error('[GlobalLocationManager] GPS error:', {
      code: error.code,
      message: error.message,
      failureCount: this.failureCount
    });
    
    // Notify subscribers of error
    this.subscribers.forEach(subscriber => {
      if (subscriber.errorCallback) {
        try {
          subscriber.errorCallback(error);
        } catch (callbackError) {
          console.error(`[GlobalLocationManager] Subscriber ${subscriber.id} error callback failed:`, callbackError);
        }
      }
    });
    
    // Stop watching if too many failures
    if (this.failureCount >= this.MAX_FAILURES) {
      console.warn('[GlobalLocationManager] Too many failures, stopping GPS watch');
      this.stopWatching();
    }
  };
  
  private startWatching() {
    if (this.isWatching || this.shouldSkipDueToFailures()) {
      return;
    }
    
    if (!navigator.geolocation) {
      console.error('[GlobalLocationManager] Geolocation not supported');
      return;
    }
    
    // Use the most permissive options from all subscribers
    const combinedOptions: PositionOptions = {
      enableHighAccuracy: Array.from(this.subscribers.values()).some(s => s.options?.enableHighAccuracy),
      timeout: Math.max(...Array.from(this.subscribers.values()).map(s => s.options?.timeout || 10000)),
      maximumAge: Math.min(...Array.from(this.subscribers.values()).map(s => s.options?.maximumAge || 60000))
    };
    
    console.log('[GlobalLocationManager] Starting GPS watch with options:', combinedOptions);
    
    this.watchId = navigator.geolocation.watchPosition(
      this.handleSuccess,
      this.handleError,
      combinedOptions
    );
    
    this.isWatching = true;
  }
  
  private stopWatching() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.isWatching = false;
    console.log('[GlobalLocationManager] Stopped GPS watch');
  }
  
  /**
   * Subscribe to location updates
   */
  subscribe(
    id: string,
    callback: (position: GeolocationPosition) => void,
    errorCallback?: (error: GeolocationPositionError) => void,
    options?: PositionOptions
  ): () => void {
    console.log(`[GlobalLocationManager] Adding subscriber: ${id}`);
    
    this.subscribers.set(id, {
      id,
      callback,
      errorCallback,
      options
    });
    
    // Provide last known position immediately if available and recent (< 30 seconds)
    if (this.lastPosition && Date.now() - this.lastPosition.timestamp < 30000) {
      try {
        callback(this.lastPosition.position);
      } catch (error) {
        console.error(`[GlobalLocationManager] Initial callback failed for ${id}:`, error);
      }
    }
    
    // Start watching if this is the first subscriber
    if (this.subscribers.size === 1) {
      this.startWatching();
    }
    
    // Return unsubscribe function
    return () => {
      console.log(`[GlobalLocationManager] Removing subscriber: ${id}`);
      this.subscribers.delete(id);
      
      // Stop watching if no more subscribers
      if (this.subscribers.size === 0) {
        this.stopWatching();
      }
    };
  }
  
  /**
   * Get current location once (not watching)
   */
  async getCurrentPosition(options?: PositionOptions): Promise<GeolocationPosition> {
    if (this.shouldSkipDueToFailures()) {
      throw new Error('GPS temporarily disabled due to repeated failures');
    }
    
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      
      // Return cached position if recent enough
      if (this.lastPosition && Date.now() - this.lastPosition.timestamp < 10000) {
        resolve(this.lastPosition.position);
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000,
          ...options
        }
      );
    });
  }
  
  /**
   * Get debugging information
   */
  getDebugInfo() {
    return {
      isWatching: this.isWatching,
      subscriberCount: this.subscribers.size,
      subscribers: Array.from(this.subscribers.keys()),
      hasPermission: this.hasPermission,
      failureCount: this.failureCount,
      lastPosition: this.lastPosition ? {
        lat: this.lastPosition.position.coords.latitude,
        lng: this.lastPosition.position.coords.longitude,
        accuracy: this.lastPosition.position.coords.accuracy,
        timestamp: this.lastPosition.timestamp
      } : null
    };
  }
  
  /**
   * Force reset failure state (for testing/debugging)
   */
  resetFailures() {
    this.failureCount = 0;
    this.lastFailureTime = 0;
    console.log('[GlobalLocationManager] Failure state reset');
  }
}

export const globalLocationManager = GlobalLocationManager.getInstance();