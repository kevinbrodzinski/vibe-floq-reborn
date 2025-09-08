import type { EnhancedFieldTile, VelocityVector, TemporalSnapshot } from '../../../../packages/types/domain/enhanced-field';

/**
 * Advanced velocity computation with enhanced Haversine calculations
 * Implements patent-compliant movement classification and GPS noise filtering
 */
export class VelocityComputer {
  private static readonly EARTH_RADIUS = 6371000; // meters
  private static readonly MIN_MOVEMENT_THRESHOLD = 0.8; // m/s minimum to register movement
  private static readonly GPS_NOISE_FILTER = 2.0; // meters - filter GPS jitter
  
  // Enhanced movement classification thresholds (m/s)
  private static readonly MOVEMENT_THRESHOLDS = {
    STATIONARY: 0.8,    // < 2.88 km/h
    WALKING: 2.0,       // < 7.2 km/h  
    CYCLING: 8.0,       // < 28.8 km/h
    DRIVING: 25.0,      // < 90 km/h
    TRANSIT: 50.0       // High-speed transit
  };
  
  /**
   * Enhanced velocity computation with GPS noise filtering
   */
  static computeVelocity(
    current: TemporalSnapshot,
    previous: TemporalSnapshot
  ): VelocityVector {
    const dt = (new Date(current.timestamp).getTime() - 
                new Date(previous.timestamp).getTime()) / 1000; // seconds
    
    if (dt <= 0 || dt > 300) { // Max 5 minute gap
      return { vx: 0, vy: 0, magnitude: 0, heading: 0, confidence: 0 };
    }
    
    // Calculate raw distance first for GPS noise filtering
    const rawDistance = this.haversineDistance(
      previous.centroid.lat, previous.centroid.lng,
      current.centroid.lat, current.centroid.lng
    );
    
    // Filter GPS noise - ignore micro-movements
    if (rawDistance < this.GPS_NOISE_FILTER) {
      return { vx: 0, vy: 0, magnitude: 0, heading: 0, confidence: 0.3 };
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
   * Enhanced movement classification with fine-grained thresholds
   */
  static classifyMovement(velocity: VelocityVector): EnhancedFieldTile['movement_mode'] {
    const speed = velocity.magnitude;
    
    if (speed < this.MOVEMENT_THRESHOLDS.STATIONARY) return 'stationary';
    if (speed <= this.MOVEMENT_THRESHOLDS.WALKING) return 'walking';
    if (speed <= this.MOVEMENT_THRESHOLDS.CYCLING) return 'cycling';
    if (speed <= this.MOVEMENT_THRESHOLDS.DRIVING) return 'driving';
    return 'transit';
  }
  
  /**
   * Calculate movement confidence based on data quality
   */
  static calculateConfidence(
    velocity: VelocityVector,
    deltaTime: number,
    distance: number
  ): number {
    // Base confidence on time delta (prefer recent data)
    let confidence = Math.min(1, Math.exp(-deltaTime / 30));
    
    // Factor in speed reasonableness (suspicious if too fast)
    if (velocity.magnitude > this.MOVEMENT_THRESHOLDS.TRANSIT) {
      confidence *= 0.3; // Low confidence for extreme speeds
    }
    
    // Distance consistency check
    const expectedDistance = velocity.magnitude * deltaTime;
    const distanceError = Math.abs(distance - expectedDistance) / Math.max(distance, expectedDistance);
    confidence *= Math.max(0.2, 1 - distanceError);
    
    return Math.max(0, Math.min(1, confidence));
  }
  
  /**
   * Enhanced Haversine distance with precise Earth radius
   */
  private static haversineDistance(
    lat1: number, lng1: number, 
    lat2: number, lng2: number
  ): number {
    const R = this.EARTH_RADIUS;
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
  
  private static toRadians(degrees: number): number {
    return degrees * Math.PI / 180;
  }
  
  /**
   * Smooth velocity using exponential moving average
   */
  static smoothVelocity(curr: VelocityVector, prev: VelocityVector, alpha = 0.3): VelocityVector {
    const vx = alpha * curr.vx + (1 - alpha) * prev.vx;
    const vy = alpha * curr.vy + (1 - alpha) * prev.vy;
    const magnitude = Math.hypot(vx, vy);
    const heading   = Math.atan2(vx, vy); // 0 = north
    // confidence: decay slightly for smoothed signals
    const confidence = Math.min(1, (curr.confidence * 0.85) + (prev.confidence * 0.15));
    return { vx, vy, magnitude, heading, confidence };
  }
  
  /**
   * Momentum ~ stability of recent velocity direction/length.
   * Return 0..1; higher = steadier flow.
   */
  static calculateMomentum(history: Array<VelocityVector | undefined>, span = 6): number {
    const v = history.filter(Boolean).slice(-span) as VelocityVector[];
    if (v.length < 2) return 0.5;
    let dirVar = 0, spdVar = 0;
    const meanSpd = v.reduce((s,a)=> s + a.magnitude, 0) / v.length;
    for (let i=1;i<v.length;i++){
      const a=v[i-1], b=v[i];
      const dθ = Math.atan2(Math.sin(b.heading-a.heading), Math.cos(b.heading-a.heading)); // wrap
      dirVar += Math.abs(dθ);
      spdVar += Math.abs(b.magnitude - a.magnitude);
    }
    dirVar /= (v.length-1); spdVar /= (v.length-1);
    // map to 0..1, favoring low variance
    const stability = 1 - Math.min(1, (dirVar/Math.PI)*0.6 + (spdVar/10)*0.4);
    return Math.max(0, Math.min(1, stability));
  }
}