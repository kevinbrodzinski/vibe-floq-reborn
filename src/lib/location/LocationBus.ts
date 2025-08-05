import { EventEmitter } from 'events';
import { haversine } from 'haversine-distance';
import { supabase } from '@/integrations/supabase/client';
import { trackError } from '@/lib/trackError';
import { h3ToGeo, geoToH3 } from 'h3-js';
import type { EnvFactors } from '@/types/location';

// Remove conflicting import and define MovementContext locally
interface MovementContext {
  speed: number;
  direction: number;
  stability: number;
}

interface LocationUpdate {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
}

interface Subscriber {
  id: string;
  callback: (location: LocationUpdate) => void;
  errorCallback: (error: string) => void;
}

export class LocationBus extends EventEmitter {
  private subscribers = new Map<string, Subscriber>();
  private currentLocation: LocationUpdate | null = null;
  private lastUpdate = 0;
  private readonly MIN_UPDATE_INTERVAL = 5000; // 5 seconds
  private readonly MIN_DISTANCE_THRESHOLD = 50; // 50 meters

  subscribe(
    id: string,
    callback: (location: LocationUpdate) => void,
    errorCallback: (error: string) => void
  ): () => void {
    this.subscribers.set(id, { id, callback, errorCallback });
    
    // Send current location if available
    if (this.currentLocation) {
      callback(this.currentLocation);
    }

    return () => {
      this.subscribers.delete(id);
    };
  }

  updateLocation(location: LocationUpdate) {
    const now = Date.now();
    
    // Throttle updates
    if (now - this.lastUpdate < this.MIN_UPDATE_INTERVAL) {
      return;
    }

    // Check if location has changed significantly
    if (this.currentLocation) {
      const distance = haversine(
        { lat: this.currentLocation.lat, lng: this.currentLocation.lng },
        { lat: location.lat, lng: location.lng }
      );
      
      if (distance < this.MIN_DISTANCE_THRESHOLD) {
        return;
      }
    }

    this.currentLocation = location;
    this.lastUpdate = now;

    // Notify all subscribers
    this.subscribers.forEach(subscriber => {
      try {
        subscriber.callback(location);
      } catch (error) {
        console.error(`Error in location subscriber ${subscriber.id}:`, error);
        subscriber.errorCallback(error instanceof Error ? error.message : 'Unknown error');
      }
    });

    // Emit event for other listeners
    this.emit('locationUpdate', location);
  }

  getCurrentLocation(): LocationUpdate | null {
    return this.currentLocation;
  }

  private async storeLocationBatch(locations: LocationUpdate[]) {
    try {
      // Convert bigint to string for JSON compatibility
      const locationData = locations.map(loc => ({
        ts: new Date(loc.timestamp).toISOString(),
        lat: loc.lat,
        lng: loc.lng,
        acc: loc.accuracy,
        timestamp: loc.timestamp,
        h3_idx: geoToH3(loc.lat, loc.lng, 9).toString(), // Convert bigint to string
      }));

      const { error } = await supabase
        .from('location_history')
        .insert({
          profile_id: (await supabase.auth.getUser()).data.user?.id,
          locations: locationData as any,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error storing location batch:', error);
      }

      return { success: true };
    } catch (error) {
      console.error('Error in storeLocationBatch:', error);
      return { success: false, error };
    }
  }

  async processLocationAnalytics(data: any) {
    try {
      // Type-safe access to JSON data
      const processed = typeof data === 'object' && data !== null ? 
        (data as any).processed : false;
      const spatialStrategy = typeof data === 'object' && data !== null ? 
        (data as any).spatial_strategy : 'unknown';
      const durationMs = typeof data === 'object' && data !== null ? 
        (data as any).duration_ms : 0;

      console.log('Processing analytics:', { processed, spatialStrategy, durationMs });
      
      return { success: true };
    } catch (error) {
      console.error('Error processing location analytics:', error);
      return { success: false, error };
    }
  }

  async getEnvFactors(): Promise<EnvFactors | null> {
    try {
      // Mocked implementation - replace with real data source
      const envFactors: EnvFactors = {
        timeOfDay: 'day',
        weatherConditions: 'clear',
        crowdDensity: 50,
        locationStability: 0.8,
      };
      return envFactors;
    } catch (error) {
      trackError(error, { context: 'LocationBus.getEnvFactors' });
      return null;
    }
  }

  async getMovementContext(): Promise<MovementContext | null> {
    try {
      // Mocked implementation - replace with real sensor data
      const movementContext: MovementContext = {
        speed: 5,
        direction: 90,
        stability: 0.7,
      };
      return movementContext;
    } catch (error) {
      trackError(error, { context: 'LocationBus.getMovementContext' });
      return null;
    }
  }

  async reverseGeocode(lat: number, lng: number): Promise<string | null> {
    try {
      // Mocked implementation - replace with real geocoding service
      return `Mocked Location: ${lat}, ${lng}`;
    } catch (error) {
      trackError(error, { context: 'LocationBus.reverseGeocode' });
      return null;
    }
  }

  async getNearbyVenues(lat: number, lng: number): Promise<any[]> {
    try {
      // Mocked implementation - replace with real venue data source
      return [
        { id: '1', name: 'Mock Venue 1', lat: lat + 0.001, lng: lng + 0.001 },
        { id: '2', name: 'Mock Venue 2', lat: lat - 0.001, lng: lng - 0.001 },
      ];
    } catch (error) {
      trackError(error, { context: 'LocationBus.getNearbyVenues' });
      return [];
    }
  }
}

export const globalLocationBus = new LocationBus();
