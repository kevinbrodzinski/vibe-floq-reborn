// Location signal collector
import type { SignalCollector, LocationSignal } from '@/types/vibe';
import { useUnifiedLocation } from '@/hooks/location/useUnifiedLocation';

export class LocationCollector implements SignalCollector {
  readonly name = 'location';
  
  private locationHook: ReturnType<typeof useUnifiedLocation> | null = null;
  private lastVenueCheck = 0;
  private currentVenue: LocationSignal['venue'] | null = null;

  constructor() {
    // Initialize location tracking
    // Note: In production, this would be properly integrated with React hooks
  }

  isAvailable(): boolean {
    // Check if location services are available
    return typeof navigator !== 'undefined' && 'geolocation' in navigator;
  }

  async collect(): Promise<LocationSignal | null> {
    try {
      // Get current position
      const coords = await this.getCurrentPosition();
      if (!coords) return null;

      // Calculate urban density (rough heuristic)
      const urbanDensity = this.estimateUrbanDensity(coords.latitude, coords.longitude);
      
      // Check for venue info (throttled to avoid excessive API calls)
      let venue = this.currentVenue;
      const now = Date.now();
      if (now - this.lastVenueCheck > 60000) { // Check every minute
        venue = await this.lookupVenue(coords);
        this.currentVenue = venue;
        this.lastVenueCheck = now;
      }

      return {
        venue: venue || undefined,
        coordinates: {
          lat: coords.latitude,
          lng: coords.longitude,
          accuracy: coords.accuracy || 100,
        },
        urbanDensity,
        timeAtLocation: this.calculateTimeAtLocation(coords),
      };
    } catch (error) {
      console.warn('Location collection failed:', error);
      return null;
    }
  }

  getQuality(): number {
    // Location quality depends on GPS accuracy and venue detection
    let quality = 0.5; // baseline

    if (this.currentVenue) {
      quality += 0.3 * this.currentVenue.confidence;
    }

    // Higher quality if we have good GPS
    // This would be determined by actual GPS accuracy in practice
    quality += 0.2;

    return Math.min(1, quality);
  }

  private async getCurrentPosition(): Promise<GeolocationCoordinates | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position.coords),
        () => resolve(null),
        { timeout: 10000, maximumAge: 30000 }
      );
    });
  }

  private estimateUrbanDensity(lat: number, lng: number): number {
    // Simple heuristic based on known urban areas
    // In production, this would use proper urban density data
    
    // Major US cities rough bounds
    const urbanCenters = [
      { lat: 40.7128, lng: -74.0060, radius: 0.5 }, // NYC
      { lat: 34.0522, lng: -118.2437, radius: 0.8 }, // LA
      { lat: 37.7749, lng: -122.4194, radius: 0.3 }, // SF
      { lat: 41.8781, lng: -87.6298, radius: 0.4 }, // Chicago
    ];

    for (const center of urbanCenters) {
      const distance = Math.sqrt(
        Math.pow(lat - center.lat, 2) + Math.pow(lng - center.lng, 2)
      );
      if (distance < center.radius) {
        return Math.max(0.3, 1 - distance / center.radius);
      }
    }

    return 0.1; // Rural/suburban default
  }

  private async lookupVenue(coords: GeolocationCoordinates): Promise<LocationSignal['venue'] | null> {
    // In production, this would use a venue lookup service
    // For now, return mock data based on time/location patterns
    
    const hour = new Date().getHours();
    const isEvening = hour >= 17 && hour <= 23;
    
    if (isEvening) {
      // Mock venue detection for evening hours
      const venues = [
        { name: 'Local Bar', category: 'bar', confidence: 0.7 },
        { name: 'Coffee Shop', category: 'cafe', confidence: 0.6 },
        { name: 'Restaurant', category: 'restaurant', confidence: 0.8 },
      ];
      
      // Return random venue with some probability
      if (Math.random() > 0.7) {
        return venues[Math.floor(Math.random() * venues.length)];
      }
    }

    return null;
  }

  private calculateTimeAtLocation(coords: GeolocationCoordinates): number {
    // Track time spent at current location
    // This would maintain a location history in practice
    return 5; // Mock: 5 minutes at current location
  }
}