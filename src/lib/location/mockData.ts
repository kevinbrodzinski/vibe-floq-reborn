/**
 * Mock data utilities for location testing and development
 * Separated from production code for clean architecture
 */
import type { GPS } from '@/lib/location/standardGeo';

export interface MockLocationOptions {
  /** Enable mock mode */
  enabled: boolean;
  /** Static coordinates to use */
  staticCoords?: GPS;
  /** Simulate movement with random walk */
  simulateMovement?: boolean;
  /** Movement radius in meters */
  movementRadius?: number;
  /** Update interval for simulated movement */
  updateIntervalMs?: number;
}

export const DEMO_LOCATIONS = {
  // Popular demo locations for testing
  sanFrancisco: { lat: 37.7749, lng: -122.4194 },
  newYork: { lat: 40.7128, lng: -74.0060 },
  london: { lat: 51.5074, lng: -0.1278 },
  tokyo: { lat: 35.6762, lng: 139.6503 },
  sydney: { lat: -33.8688, lng: 151.2093 },
  
  // Test venues
  venue1: { lat: 37.7849, lng: -122.4094 },
  venue2: { lat: 37.7649, lng: -122.4294 },
  venue3: { lat: 37.7749, lng: -122.4394 },
} as const;

export const DEMO_USERS = [
  'kaleb', 'beata', 'alex', 'sam', 'jordan', 'casey', 'avery', 'taylor'
] as const;

/**
 * Generate mock location data for testing
 */
export class MockLocationGenerator {
  private currentLocation: GPS;
  private intervalId: number | null = null;
  private callbacks: Array<(coords: GPS) => void> = [];

  constructor(private options: MockLocationOptions) {
    this.currentLocation = options.staticCoords || DEMO_LOCATIONS.sanFrancisco;
  }

  start() {
    if (!this.options.enabled || this.intervalId !== null) return;

    if (this.options.simulateMovement) {
      this.intervalId = setInterval(() => {
        this.updateLocation();
      }, this.options.updateIntervalMs || 5000);
    }

    // Initial callback
    this.notifyCallbacks();
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  onLocationUpdate(callback: (coords: GPS) => void) {
    this.callbacks.push(callback);
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index > -1) this.callbacks.splice(index, 1);
    };
  }

  getCurrentLocation(): GPS {
    return { ...this.currentLocation };
  }

  private updateLocation() {
    if (!this.options.simulateMovement) return;

    const radius = this.options.movementRadius || 100; // meters
    const latOffset = (Math.random() - 0.5) * (radius / 111320); // ~111320 meters per degree
    const lngOffset = (Math.random() - 0.5) * (radius / (111320 * Math.cos(this.currentLocation.lat * Math.PI / 180)));

    this.currentLocation = {
      lat: this.currentLocation.lat + latOffset,
      lng: this.currentLocation.lng + lngOffset,
    };

    this.notifyCallbacks();
  }

  private notifyCallbacks() {
    this.callbacks.forEach(callback => callback(this.getCurrentLocation()));
  }
}

/**
 * Check if a profile ID should use demo/mock data
 */
export function isDemoProfile(profileId: string): boolean {
  return DEMO_USERS.some(username => profileId.includes(username));
}

/**
 * Generate demo location sharing status
 */
export function generateDemoLocationSharing() {
  return {
    isSharing: Math.random() > 0.3, // 70% chance of sharing
    accuracyLevel: 'exact' as const,
    sharedSince: new Date(Date.now() - Math.random() * 3600000), // Random time in last hour
  };
}

/**
 * Generate demo friend locations around a center point
 */
export function generateDemoFriendLocations(center: GPS, count = 5) {
  const locations: Record<string, GPS & { ts: number; acc: number }> = {};
  
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * 2 * Math.PI;
    const distance = 200 + Math.random() * 800; // 200-1000m radius
    
    const latOffset = (distance * Math.cos(angle)) / 111320;
    const lngOffset = (distance * Math.sin(angle)) / (111320 * Math.cos(center.lat * Math.PI / 180));
    
    const friendId = `demo-friend-${i}`;
    locations[friendId] = {
      lat: center.lat + latOffset,
      lng: center.lng + lngOffset,
      ts: Date.now() - Math.random() * 300000, // Random time in last 5 minutes
      acc: 10 + Math.random() * 50, // 10-60m accuracy
    };
  }
  
  return locations;
}

/**
 * Environment-aware mock configuration
 */
export function getMockLocationConfig(): MockLocationOptions {
  const isDev = process.env.NODE_ENV === 'development';
  const isDemo = typeof window !== 'undefined' && (
    window.location.hostname.includes('demo') || 
    window.location.search.includes('demo=true')
  );
  
  return {
    enabled: isDev || isDemo,
    staticCoords: DEMO_LOCATIONS.sanFrancisco,
    simulateMovement: isDev,
    movementRadius: 50,
    updateIntervalMs: 10000,
  };
}