import type { TemporalSnapshot, VelocityVector, EnhancedFieldTile } from '@/types/field';

/**
 * Velocity computation based on patent specifications
 * Implements Haversine calculations and movement classification
 */
export class VelocityComputer {
  private static readonly WALKING_SPEED_RANGE = { min: 1, max: 2 }; // m/s
  private static readonly CYCLING_SPEED_RANGE = { min: 3, max: 8 }; // m/s
  private static readonly DRIVING_SPEED_RANGE = { min: 8, max: 30 }; // m/s
  private static readonly EARTH_RADIUS = 6371000; // meters
  
  /**
   * Compute velocity vector between two temporal snapshots
   */
  static computeVelocity(
    current: TemporalSnapshot,
    previous: TemporalSnapshot
  ): VelocityVector {
    const dt = (new Date(current.timestamp).getTime() - 
                new Date(previous.timestamp).getTime()) / 1000; // seconds
    
    if (dt === 0 || dt < 0) {
      return { vx: 0, vy: 0, magnitude: 0, heading: 0, confidence: 0 };
    }
    
    // Convert to radians
    const lat1 = previous.centroid.lat * Math.PI / 180;
    const lat2 = current.centroid.lat * Math.PI / 180;
    const dLat = (current.centroid.lat - previous.centroid.lat) * Math.PI / 180;
    const dLng = (current.centroid.lng - previous.centroid.lng) * Math.PI / 180;
    
    // Calculate displacement in meters using Haversine
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = this.EARTH_RADIUS * c;
    
    // Calculate velocity components (meters per second)
    const dx = this.EARTH_RADIUS * Math.cos((lat1 + lat2) / 2) * dLng;
    const dy = this.EARTH_RADIUS * dLat;
    
    const vx = dx / dt;
    const vy = dy / dt;
    const magnitude = Math.sqrt(vx * vx + vy * vy);
    const heading = Math.atan2(vx, vy); // Radians from north
    
    // Confidence based on time delta and magnitude reasonableness
    const timeConfidence = Math.min(1, Math.exp(-dt / 30)); // Decay for old data
    const speedConfidence = magnitude < 50 ? 1 : Math.exp(-(magnitude - 50) / 20); // Lower confidence for extreme speeds
    const confidence = timeConfidence * speedConfidence;
    
    return { vx, vy, magnitude, heading, confidence };
  }
  
  /**
   * Classify movement mode based on velocity magnitude
   */
  static classifyMovement(velocity: VelocityVector): EnhancedFieldTile['movement_mode'] {
    const speed = velocity.magnitude;
    
    if (speed < 0.5) return 'stationary';
    if (speed <= this.WALKING_SPEED_RANGE.max) return 'walking';
    if (speed <= this.CYCLING_SPEED_RANGE.max) return 'cycling';
    if (speed <= this.DRIVING_SPEED_RANGE.max) return 'driving';
    return 'transit';
  }
  
  /**
   * Smooth velocity using exponential moving average
   */
  static smoothVelocity(
    current: VelocityVector, 
    previous: VelocityVector, 
    alpha: number = 0.3
  ): VelocityVector {
    if (!previous || previous.confidence === 0) return current;
    
    const vx = alpha * current.vx + (1 - alpha) * previous.vx;
    const vy = alpha * current.vy + (1 - alpha) * previous.vy;
    const magnitude = Math.sqrt(vx * vx + vy * vy);
    const heading = Math.atan2(vx, vy);
    const confidence = Math.max(current.confidence, previous.confidence * 0.8);
    
    return { vx, vy, magnitude, heading, confidence };
  }
  
  /**
   * Calculate momentum stability (consistency of movement pattern)
   */
  static calculateMomentum(velocityHistory: VelocityVector[]): number {
    if (velocityHistory.length < 2) return 0;
    
    // Calculate variance in velocity vectors
    const avgVx = velocityHistory.reduce((sum, v) => sum + v.vx, 0) / velocityHistory.length;
    const avgVy = velocityHistory.reduce((sum, v) => sum + v.vy, 0) / velocityHistory.length;
    
    const variance = velocityHistory.reduce((sum, v) => {
      return sum + Math.pow(v.vx - avgVx, 2) + Math.pow(v.vy - avgVy, 2);
    }, 0) / velocityHistory.length;
    
    // Convert variance to momentum score (0-1, lower variance = higher momentum)
    return Math.max(0, Math.min(1, Math.exp(-variance / 100)));
  }
}