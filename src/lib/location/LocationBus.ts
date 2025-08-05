import { supabase } from '@/integrations/supabase/client';
import { latLngToCell } from 'h3-js';
import type { 
  LocationPoint, 
  MovementContext as ImportedMovementContext,
  VenueDetectionResult,
  ProximityEventRecord 
} from '@/types/location';
import { calculateDistance } from '@/lib/location/standardGeo';

// Extend the existing MovementContext interface
interface MovementContext extends ImportedMovementContext {
  isMoving: boolean;
  speed?: number;
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

      // 2. Rate limiting (example: 1 update per 5 seconds)
      if (this.lastLocation && (loc.timestamp - this.lastLocation.timestamp) < 5000) {
        console.debug('Rate limited location update');
        return;
      }

      // 3. Enrich with movement context
      const enrichedLoc = {
        ...loc,
        isMoving: this.movementContext.isMoving,
        speed: this.movementContext.speed,
        bearing: this.movementContext.bearing
      };

      // 4. Batch insert to staging
      await this.batchInsertLocations([enrichedLoc]);

      // 5. Proximity detection (example: venue check-ins)
      await this.detectVenueProximity(enrichedLoc);

      // 6. Movement heuristics (example: significant distance)
      if (this.lastLocation) {
        const distance = calculateDistance(
          { lat: loc.lat, lng: loc.lng },
          { lat: this.lastLocation.lat, lng: this.lastLocation.lng }
        );

        if (distance > 200) {
          console.log(`Significant movement detected: ${distance}m`);
          // Trigger some event or notification
        }
      }

      this.lastLocation = loc;
    } catch (error) {
      console.error('Error handling location update:', error);
    }
  }

  private async batchInsertLocations(locations: LocationPoint[]): Promise<void> {
    if (locations.length === 0) return;

    try {
      // Add H3 index to each location using correct function name
      const enrichedLocations = locations.map(loc => ({
        user_id: this.userId,
        captured_at: new Date(loc.timestamp).toISOString(),
        lat: loc.lat,
        lng: loc.lng,
        acc: loc.accuracy,
        // Convert bigint to string for JSON compatibility
        h3_idx: latLngToCell(loc.lat, loc.lng, 8).toString()
      }));

      // Simulate rate limiting on the client side
      await new Promise(resolve => setTimeout(resolve, 200));

      const { error } = await supabase
        .from('raw_locations_staging')
        .insert(enrichedLocations);

      if (error) {
        console.error('Failed to insert locations:', error);
        throw error;
      }

      console.log(`✓ Inserted ${locations.length} locations to staging`);
    } catch (err) {
      console.error('Batch insert failed:', err);
      throw err;
    }
  }

  private async detectVenueProximity(loc: LocationPoint): Promise<void> {
    // 1. Check cached venues first
    const cachedVenue = Object.values(this.venueCache).find(venue =>
      calculateDistance({ lat: loc.lat, lng: loc.lng }, { lat: venue.location.lat, lng: venue.location.lng }) <= venue.distance
    );

    if (cachedVenue) {
      console.log(`Proximity event (cached): ${cachedVenue.name}`);
      this.enqueueProximityEvent(loc, cachedVenue);
      return;
    }

    // 2. Fetch nearby venues (example: within 500m)
    const { data: venues, error } = await supabase
      .from('venues')
      .select('id, name, lat, lng, radius_m')
      .range(0, 5)
      .order('popularity', { ascending: false });

    if (error) {
      console.error('Failed to fetch nearby venues:', error);
      return;
    }

    // 3. Find venues within proximity
    for (const venue of venues || []) {
      const distance = calculateDistance(
        { lat: loc.lat, lng: loc.lng },
        { lat: venue.lat, lng: venue.lng }
      );

      if (distance <= venue.radius_m) {
        console.log(`Proximity event (new): ${venue.name}`);
        const venueResult: VenueDetectionResult = {
          id: venue.id,
          name: venue.name,
          venue_id: venue.id,
          confidence: 0.8,
          location: { lat: venue.lat, lng: venue.lng },
          distance
        };
        this.venueCache[venue.id] = venueResult;
        this.enqueueProximityEvent(loc, venueResult);
      }
    }
  }

  private enqueueProximityEvent(loc: LocationPoint, venue: VenueDetectionResult): void {
    const event: ProximityEventRecord = {
      id: `${this.userId}-${venue.id}-${Date.now()}`,
      profile_id: this.userId,
      event_type: 'venue_proximity',
      proximity_data: { 
        venue_id: venue.id,
        location: { lat: loc.lat, lng: loc.lng },
        distance: venue.distance
      },
      created_at: new Date(loc.timestamp).toISOString()
    };

    this.proximityEventQueue.push(event);
    console.debug('Proximity event enqueued:', event);

    // Process queue if it reaches a certain size
    if (this.proximityEventQueue.length >= 5) {
      this.processProximityEventQueue();
    }
  }

  private async processProximityEventQueue(): Promise<void> {
    if (this.proximityEventQueue.length === 0) return;

    try {
      // 1. Deduplicate events (example: by venue and time window)
      const dedupedEvents = this.deduplicateProximityEvents(this.proximityEventQueue);

      // 2. Insert into proximity_events table
      const { error } = await supabase
        .from('proximity_events')
        .insert(dedupedEvents);

      if (error) {
        console.error('Failed to insert proximity events:', error);
        return;
      }

      console.log(`✓ Inserted ${dedupedEvents.length} proximity events`);
      this.proximityEventQueue = []; // Clear the queue
    } catch (err) {
      console.error('Proximity event processing failed:', err);
    }
  }

  private deduplicateProximityEvents(events: ProximityEventRecord[]): ProximityEventRecord[] {
    const seen = new Set<string>();
    const deduped: ProximityEventRecord[] = [];

    for (const event of events) {
      const key = `${event.proximity_data.venue_id}-${Math.floor(new Date(event.created_at).getTime() / (60 * 1000))}`; // 1-minute window
      if (!seen.has(key)) {
        deduped.push(event);
        seen.add(key);
      }
    }

    return deduped;
  }
}

// Export singleton instance
export const locationBus = new LocationBus('current-user-id');