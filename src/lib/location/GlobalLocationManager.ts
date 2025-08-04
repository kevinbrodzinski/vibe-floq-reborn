/**
 * Global Location Manager - Coordinates all GPS requests across the app
 * Uses useGeo as foundation to preserve sophisticated caching and error handling
 * Implements single GPS watch pattern with LocationBus distribution
 */

import { useGeo, type GeoState, type GeoOpts } from '@/hooks/useGeo';
import { useEffect, useRef } from 'react';

interface LocationSubscriber {
  id: string;
  callback: (coords: { lat: number; lng: number; accuracy: number; timestamp: number }) => void;
  errorCallback?: (error: string) => void;
  options?: {
    minDistance?: number;
    minTime?: number;
    priority?: 'high' | 'medium' | 'low';
  };
}

interface LocationManagerMetrics {
  subscriberCount: number;
  activeSubscribers: number;
  lastUpdateTime: number;
  gpsAccuracy: number;
  hasPermission: boolean;
  isWatching: boolean;
  failureCount: number;
  totalUpdates: number;
}

class GlobalLocationManager {
  private subscribers: Map<string, LocationSubscriber> = new Map();
  private lastPosition: { lat: number; lng: number; accuracy: number; timestamp: number } | null = null;
  private failureCount = 0;
  private lastFailureTime = 0;
  private totalUpdates = 0;
  private readonly MAX_FAILURES = 5;
  private readonly FAILURE_RESET_TIME = 5 * 60 * 1000; // 5 minutes
  
  private static instance: GlobalLocationManager | null = null;
  private geoHookRef: React.MutableRefObject<GeoState | null> = { current: null };
  private isInitialized = false;
  
  static getInstance(): GlobalLocationManager {
    if (!GlobalLocationManager.instance) {
      GlobalLocationManager.instance = new GlobalLocationManager();
    }
    return GlobalLocationManager.instance;
  }
  
  private constructor() {
    // Private constructor for singleton
  }
  
  /**
   * Initialize the manager with useGeo hook (called from React component)
   */
  initializeWithGeoHook(geoState: GeoState): void {
    if (this.isInitialized) return;
    
    this.geoHookRef.current = geoState;
    this.isInitialized = true;
    
    // Process location updates from useGeo
    if (geoState.coords && geoState.status === 'success') {
      this.handleLocationUpdate({
        lat: geoState.coords.lat,
        lng: geoState.coords.lng,
        accuracy: geoState.accuracy || 0,
        timestamp: geoState.ts || Date.now()
      });
    }
    
    // Handle errors from useGeo
    if (geoState.status === 'error' && geoState.error) {
      this.handleLocationError(geoState.error);
    }
  }
  
  private handleLocationUpdate(position: { lat: number; lng: number; accuracy: number; timestamp: number }) {
    // Reset failure count on successful update
    this.failureCount = 0;
    this.totalUpdates++;
    
    this.lastPosition = position;
    
    // Notify all subscribers with distance and time filtering
    this.subscribers.forEach((subscriber, id) => {
      try {
        const shouldNotify = this.shouldNotifySubscriber(subscriber, position);
        if (shouldNotify) {
          subscriber.callback(position);
        }
      } catch (error) {
        console.error(`[GlobalLocationManager] Subscriber ${id} callback failed:`, error);
        // Remove failing subscriber
        this.subscribers.delete(id);
      }
    });
  }
  
  private handleLocationError(error: string) {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    console.error('[GlobalLocationManager] GPS error:', {
      error,
      failureCount: this.failureCount
    });
    
    // Notify subscribers of error
    this.subscribers.forEach((subscriber, id) => {
      if (subscriber.errorCallback) {
        try {
          subscriber.errorCallback(error);
        } catch (callbackError) {
          console.error(`[GlobalLocationManager] Error callback failed for ${id}:`, callbackError);
        }
      }
    });
  }
  
  private shouldNotifySubscriber(
    subscriber: LocationSubscriber, 
    position: { lat: number; lng: number; accuracy: number; timestamp: number }
  ): boolean {
    const options = subscriber.options || {};
    
    // Check minimum time interval
    if (options.minTime && this.lastPosition) {
      const timeDiff = position.timestamp - this.lastPosition.timestamp;
      if (timeDiff < options.minTime) {
        return false;
      }
    }
    
    // Check minimum distance
    if (options.minDistance && this.lastPosition) {
      const distance = this.calculateDistance(
        this.lastPosition.lat, this.lastPosition.lng,
        position.lat, position.lng
      );
      if (distance < options.minDistance) {
        return false;
      }
    }
    
    return true;
  }
  
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }
  
  /**
   * Subscribe to location updates
   */
  subscribe(subscriber: LocationSubscriber): () => void {
    this.subscribers.set(subscriber.id, subscriber);
    
    // Immediately provide last known position if available
    if (this.lastPosition) {
      try {
        subscriber.callback(this.lastPosition);
      } catch (error) {
        console.error(`[GlobalLocationManager] Initial callback failed for ${subscriber.id}:`, error);
      }
    }
    
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(subscriber.id);
    };
  }
  
  /**
   * Get current location (if available)
   */
  getCurrentLocation(): { lat: number; lng: number; accuracy: number; timestamp: number } | null {
    return this.lastPosition;
  }
  
  /**
   * Check if GPS permission is granted
   */
  hasGPSPermission(): boolean {
    return this.geoHookRef.current?.hasPermission || false;
  }
  
  /**
   * Request location permission (delegates to useGeo)
   */
  requestLocationPermission(): void {
    if (this.geoHookRef.current?.requestLocation) {
      this.geoHookRef.current.requestLocation();
    }
  }
  
  /**
   * Get debug information for health dashboard
   */
  getDebugInfo(): LocationManagerMetrics {
    const geoState = this.geoHookRef.current;
    
    return {
      subscriberCount: this.subscribers.size,
      activeSubscribers: this.subscribers.size, // All subscribers are active in this model
      lastUpdateTime: this.lastPosition?.timestamp || 0,
      gpsAccuracy: this.lastPosition?.accuracy || 0,
      hasPermission: geoState?.hasPermission || false,
      isWatching: geoState?.status === 'loading' || geoState?.status === 'success',
      failureCount: this.failureCount,
      totalUpdates: this.totalUpdates
    };
  }
  
  /**
   * Reset failure count (for manual recovery)
   */
  resetFailures(): void {
    this.failureCount = 0;
    this.lastFailureTime = 0;
  }
  
  /**
   * Get subscriber count by priority
   */
  getSubscribersByPriority(): { high: number; medium: number; low: number } {
    const counts = { high: 0, medium: 0, low: 0 };
    
    this.subscribers.forEach(subscriber => {
      const priority = subscriber.options?.priority || 'medium';
      counts[priority]++;
    });
    
    return counts;
  }
}

// Export singleton instance
export const globalLocationManager = GlobalLocationManager.getInstance();

/**
 * React hook to initialize GlobalLocationManager with useGeo
 * This should be called once at the app level
 */
export function useGlobalLocationManager(options: GeoOpts = {}) {
  const geoState = useGeo({
    watch: true,
    enableHighAccuracy: true,
    minDistanceM: 10,
    debounceMs: 2000,
    ...options
  });
  
  // Initialize manager with geo state
  useEffect(() => {
    globalLocationManager.initializeWithGeoHook(geoState);
  }, [geoState.coords, geoState.status, geoState.error]);
  
  return {
    geoState,
    manager: globalLocationManager
  };
}