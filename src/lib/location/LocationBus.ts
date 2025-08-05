import { supabase } from '@/integrations/supabase/client';
import { latLngToCell } from 'h3-js';
import type { 
  LocationPoint, 
  MovementContext as ImportedMovementContext,
  VenueDetectionResult
} from '@/types/location';
import type { ProximityEventRecord } from './proximityEventRecorder';
import { calculateDistance } from '@/lib/location/standardGeo';

// Extend the existing MovementContext interface
interface MovementContext extends ImportedMovementContext {
  isMoving: boolean;
  speed: number;
  bearing?: number;
}

export class LocationBus {
  private userId: string;
  private lastLocation: LocationPoint | null = null;
  private movementContext: MovementContext = { isMoving: false, speed: 0, direction: 0, stability: 1 };
  private venueCache: Record<string, VenueDetectionResult> = {};
  private proximityEventQueue: ProximityEventRecord[] = [];

  constructor(userId: string) {
    this.userId = userId;
  }

  // Add stub methods for compatibility
  registerConsumer = (id: string, handler: (loc: LocationPoint) => void) => {
    console.warn('LocationBus.registerConsumer is stubbed');
    return () => {}; // Return unsubscribe function
  };

  getH3Neighbors = (lat: number, lng: number, ringSize = 1) => {
    console.warn('LocationBus.getH3Neighbors is stubbed');
    return []; // Return empty array for now
  };

  getOptimalH3RingSize = (radiusMeters: number) => {
    console.warn('LocationBus.getOptimalH3RingSize is stubbed');
    return 1; // Return default ring size
  };

  public getDebugInfo() {
    return {
      isHealthy: true,
      consumers: [],
      batchQueue: [],
      metrics: {
        averageLatency: 0,
        errorRate: 0,
        writeRate: 0
      }
    };
  }

  public setMovementContext(context: MovementContext): void {
    this.movementContext = context;
  }

  public async handleLocationUpdate(loc: LocationPoint): Promise<void> {
    try {
      // 1. Basic validation
      if (!loc.lat || !loc.lng) {
        console.warn('Invalid location:', loc);
        return;
      }

      // 2. Movement analysis
      if (this.lastLocation) {
        const distance = calculateDistance(this.lastLocation, loc);
        const timeDiff = loc.timestamp - this.lastLocation.timestamp;
        
        if (timeDiff > 0) {
          const speed = (distance / timeDiff) * 1000; // m/s
          this.movementContext = {
            ...this.movementContext,
            isMoving: speed > 1.0, // 1 m/s threshold
            speed
          };
        }
      }

      // 3. Venue detection (if enabled)
      const nearbyVenues = await this.detectNearbyVenues(loc);
      
      // 4. Proximity analysis (if enabled)
      await this.analyzeProximity(loc);

      // 5. Update last location
      this.lastLocation = loc;

      console.log('✓ Location processed:', {
        coords: { lat: loc.lat, lng: loc.lng },
        movement: this.movementContext,
        venues: nearbyVenues.length
      });

    } catch (error) {
      console.error('Location update failed:', error);
    }
  }

  private async detectNearbyVenues(loc: LocationPoint): Promise<VenueDetectionResult[]> {
    try {
      const cacheKey = `${Math.round(loc.lat * 1000)}_${Math.round(loc.lng * 1000)}`;
      
      if (this.venueCache[cacheKey]) {
        return [this.venueCache[cacheKey]];
      }

      // Mock venue detection for now
      const mockVenues: VenueDetectionResult[] = [];
      
      if (mockVenues.length > 0) {
        this.venueCache[cacheKey] = mockVenues[0];
      }

      return mockVenues;
    } catch (error) {
      console.error('Venue detection failed:', error);
      return [];
    }
  }

  private async analyzeProximity(loc: LocationPoint): Promise<void> {
    try {
      // Mock proximity analysis for now
      console.log('Proximity analysis stubbed for location:', loc);
    } catch (error) {
      console.error('Proximity analysis failed:', error);
    }
  }

  public async flushProximityEvents(): Promise<void> {
    if (this.proximityEventQueue.length === 0) return;

    try {
      console.log('Proximity events flushing stubbed - queue length:', this.proximityEventQueue.length);
      this.proximityEventQueue = []; // Clear the queue
    } catch (err) {
      console.error('Proximity event processing failed:', err);
    }
  }

  private deduplicateProximityEvents(events: ProximityEventRecord[]): ProximityEventRecord[] {
    const seen = new Set();
    return events.filter(event => {
      // Use the correct field names from the database schema
      const key = `${event.profile_id_a}_${event.profile_id_b}_${event.event_type}_${event.event_ts}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}

// Create singleton instance
export const locationBus = new LocationBus('current-user');