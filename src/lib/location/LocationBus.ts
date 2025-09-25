import type { 
  LocationPoint, 
  MovementContext as ImportedMovementContext,
  VenueDetectionResult
} from '@/types/location';
import type { ProximityEventRecord } from './proximityEventRecorder';
import { calculateDistance } from '@/lib/location/standardGeo';
import { latLngToCell, gridDisk } from 'h3-js';

// Extend the existing MovementContext interface
interface MovementContext extends ImportedMovementContext {
  isMoving: boolean;
  speed: number;
  bearing?: number;
}

interface LocationConsumer {
  id: string;
  handler: (loc: LocationPoint) => void;
  priority: number;
}

export class LocationBus {
  private profileId: string;
  private lastLocation: LocationPoint | null = null;
  private movementContext: MovementContext = { isMoving: false, speed: 0, direction: 0, stability: 1 };
  private venueCache: Record<string, VenueDetectionResult> = {};
  private proximityEventQueue: ProximityEventRecord[] = [];
  private consumers: Map<string, LocationConsumer> = new Map();
  private isProcessing = false;

  constructor(profileId: string) {
    this.profileId = profileId;
  }

  // Real consumer registration with priority
  registerConsumer = (id: string, handler: (loc: LocationPoint) => void, priority: number = 0) => {
    console.log(`[LocationBus] Registering consumer: ${id} (priority: ${priority})`);
    
    this.consumers.set(id, { id, handler, priority });
    
    // Return unsubscribe function
    return () => {
      console.log(`[LocationBus] Unregistering consumer: ${id}`);
      this.consumers.delete(id);
    };
  };

  // Broadcast location to all consumers
  private broadcastLocation = (location: LocationPoint) => {
    if (this.isProcessing) return; // Prevent recursive calls
    
    this.isProcessing = true;
    
    try {
      // Sort consumers by priority (higher priority first)
      const sortedConsumers = Array.from(this.consumers.values())
        .sort((a, b) => b.priority - a.priority);
      
      for (const consumer of sortedConsumers) {
        try {
          consumer.handler(location);
        } catch (error) {
          console.error(`[LocationBus] Consumer ${consumer.id} error:`, error);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  };

  // Enhanced H3 neighbor calculation
  getH3Neighbors = (lat: number, lng: number, ringSize = 1): bigint[] => {
    try {
      // Use proper H3 library for neighbor calculation
      const centerH3 = latLngToCell(lat, lng, 8); // Resolution 8
      const neighbors = gridDisk(centerH3, ringSize);
      
      // Convert to bigint array
      return neighbors.map(h3Index => BigInt(h3Index));
    } catch (error) {
      console.error('[LocationBus] H3 neighbor calculation failed:', error);
      return [];
    }
  };

  getOptimalH3RingSize = (radiusMeters: number) => {
    // Simple heuristic: 1 ring per 100m radius
    return Math.max(1, Math.ceil(radiusMeters / 100));
  };

  public getDebugInfo() {
    return {
      isHealthy: true,
      consumers: Array.from(this.consumers.keys()),
      consumerCount: this.consumers.size,
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

      // 2. Broadcast to all consumers
      this.broadcastLocation(loc);

      // 3. Movement analysis
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

      // 4. Venue detection (if enabled)
      const nearbyVenues = await this.detectNearbyVenues(loc);
      
      // 5. Proximity analysis (if enabled)
      await this.analyzeProximity(loc);

      // 6. Update last location
      this.lastLocation = loc;

      console.log('✓ Location processed:', {
        coords: { lat: loc.lat, lng: loc.lng },
        movement: this.movementContext,
        venues: nearbyVenues.length,
        consumers: this.consumers.size
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