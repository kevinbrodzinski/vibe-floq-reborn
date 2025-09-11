// Movement signal collector
import type { SignalCollector, MovementSignal } from '@/types/vibe';

export class MovementCollector implements SignalCollector<MovementSignal> {
  readonly name = 'movement';
  
  private lastPosition: { lat: number; lng: number; timestamp: number } | null = null;
  private speedHistory: number[] = [];
  private maxHistoryLength = 10;

  isAvailable(): boolean {
    return typeof navigator !== 'undefined' && 'geolocation' in navigator;
  }

  async collect(): Promise<MovementSignal | null> {
    try {
      const coords = await this.getCurrentPosition();
      if (!coords) return null;

      const now = Date.now();
      let speed = 0;
      let activity: MovementSignal['activity'] = 'unknown';

      // Calculate speed if we have previous position
      if (this.lastPosition) {
        const timeDelta = (now - this.lastPosition.timestamp) / 1000; // seconds
        if (timeDelta > 0) {
          const distance = this.calculateDistance(
            this.lastPosition.lat,
            this.lastPosition.lng,
            coords.latitude,
            coords.longitude
          );
          speed = distance / timeDelta; // m/s
        }
      }

      // Update position history
      this.lastPosition = {
        lat: coords.latitude,
        lng: coords.longitude,
        timestamp: now,
      };

      // Update speed history
      this.speedHistory.push(speed);
      if (this.speedHistory.length > this.maxHistoryLength) {
        this.speedHistory.shift();
      }

      // Classify activity based on speed
      activity = this.classifyActivity(speed);

      // Calculate movement stability
      const stability = this.calculateStability();

      return {
        speed,
        activity,
        stability,
        heading: coords.heading || undefined,
      };
    } catch (error) {
      console.warn('Movement collection failed:', error);
      return null;
    }
  }

  getQuality(): number {
    // Movement quality depends on GPS accuracy and speed consistency
    let quality = 0.6; // baseline

    if (this.speedHistory.length >= 3) {
      // Higher quality with more data points
      quality += 0.2;
      
      // Bonus for consistent readings
      const stability = this.calculateStability();
      quality += stability * 0.2;
    }

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
        { 
          timeout: 5000, 
          maximumAge: 10000,
          enableHighAccuracy: true 
        }
      );
    });
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    // Haversine formula for distance between two points
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private classifyActivity(speed: number): MovementSignal['activity'] {
    // Speed thresholds for activity classification
    if (speed < 0.5) return 'stationary';
    if (speed < 2.0) return 'walking';
    if (speed < 25.0) return 'transit'; // Could be cycling, car, etc.
    return 'unknown';
  }

  private calculateStability(): number {
    if (this.speedHistory.length < 2) return 0.5;

    // Calculate coefficient of variation (std dev / mean)
    const mean = this.speedHistory.reduce((a, b) => a + b, 0) / this.speedHistory.length;
    if (mean === 0) return 1.0; // Perfectly stable (stationary)

    const variance = this.speedHistory.reduce((sum, speed) => {
      return sum + Math.pow(speed - mean, 2);
    }, 0) / this.speedHistory.length;

    const stdDev = Math.sqrt(variance);
    const cv = stdDev / mean;

    // Lower coefficient of variation = higher stability
    return Math.max(0, 1 - cv);
  }
}