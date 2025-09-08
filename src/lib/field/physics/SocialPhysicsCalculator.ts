import type { EnhancedFieldTile, TemporalSnapshot } from '../../../../packages/types/domain/enhanced-field';

/**
 * Social cohesion and convergence calculations
 * Based on patent clustering specifications
 */
export class SocialPhysicsCalculator {
  private static readonly MAX_COHESION_DISTANCE = 100; // meters
  private static readonly MAX_CONVERGENCE_TIME = 300; // 5 minutes
  private static readonly MIN_CONVERGENCE_SPEED = 0.1; // m/s
  
  /**
   * Compute social cohesion score based on spatial and vibe proximity
   */
  static computeCohesion(
    tile: EnhancedFieldTile,
    nearbyTiles: EnhancedFieldTile[]
  ): number {
    if (nearbyTiles.length === 0) return 0;
    
    const allTiles = [tile, ...nearbyTiles];
    
    // Calculate spatial cohesion (based on centroids)
    const spatialCohesion = this.calculateSpatialCohesion(allTiles);
    
    // Calculate vibe cohesion (similarity in vibe space)
    const vibeCohesion = this.calculateVibeCohesion(allTiles);
    
    // Calculate crowd density cohesion
    const densityCohesion = this.calculateDensityCohesion(allTiles);
    
    // Weighted combination
    return (
      spatialCohesion * 0.4 +
      vibeCohesion * 0.4 +
      densityCohesion * 0.2
    );
  }
  
  private static calculateSpatialCohesion(tiles: EnhancedFieldTile[]): number {
    if (tiles.length < 2) return 1;
    
    // Calculate centroid of all tiles
    const avgLat = tiles.reduce((sum, t) => 
      sum + (t.history?.[0]?.centroid.lat || 0), 0) / tiles.length;
    const avgLng = tiles.reduce((sum, t) => 
      sum + (t.history?.[0]?.centroid.lng || 0), 0) / tiles.length;
    
    // Calculate average distance from centroid
    const avgDistance = tiles.reduce((sum, t) => {
      const lat = t.history?.[0]?.centroid.lat || 0;
      const lng = t.history?.[0]?.centroid.lng || 0;
      const distance = this.haversineDistance(lat, lng, avgLat, avgLng);
      return sum + distance;
    }, 0) / tiles.length;
    
    // Convert to cohesion score (closer = higher cohesion)
    return Math.max(0, 1 - (avgDistance / this.MAX_COHESION_DISTANCE));
  }
  
  private static calculateVibeCohesion(tiles: EnhancedFieldTile[]): number {
    if (tiles.length < 2) return 1;
    
    // Calculate variance in HSL space
    const vibes = tiles.map(t => t.avg_vibe);
    const avgH = vibes.reduce((sum, v) => sum + v.h, 0) / vibes.length;
    const avgS = vibes.reduce((sum, v) => sum + v.s, 0) / vibes.length;
    const avgL = vibes.reduce((sum, v) => sum + v.l, 0) / vibes.length;
    
    const variance = vibes.reduce((sum, v) => {
      // Handle hue circularity (0° = 360°)
      const hDiff = Math.min(
        Math.abs(v.h - avgH),
        360 - Math.abs(v.h - avgH)
      );
      return sum + 
        Math.pow(hDiff, 2) + 
        Math.pow(v.s - avgS, 2) + 
        Math.pow(v.l - avgL, 2);
    }, 0) / vibes.length;
    
    // Convert variance to cohesion score
    return Math.exp(-variance / 10000); // Exponential decay
  }
  
  private static calculateDensityCohesion(tiles: EnhancedFieldTile[]): number {
    if (tiles.length < 2) return 1;
    
    // Calculate coefficient of variation for crowd counts
    const counts = tiles.map(t => t.crowd_count);
    const avgCount = counts.reduce((sum, c) => sum + c, 0) / counts.length;
    
    if (avgCount === 0) return 0;
    
    const variance = counts.reduce((sum, c) => 
      sum + Math.pow(c - avgCount, 2), 0) / counts.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = stdDev / avgCount;
    
    // Lower variation = higher cohesion
    return Math.max(0, 1 - coefficientOfVariation);
  }
  
  /**
   * Detect potential convergence between two tiles
   */
  static detectConvergence(
    tileA: EnhancedFieldTile,
    tileB: EnhancedFieldTile
  ): EnhancedFieldTile['convergence_vector'] | undefined {
    if (!tileA.velocity || !tileB.velocity || 
        !tileA.history?.[0] || !tileB.history?.[0]) {
      return undefined;
    }
    
    const posA = tileA.history[0].centroid;
    const posB = tileB.history[0].centroid;
    
    // Calculate relative position and velocity
    const dx = posB.lng - posA.lng;
    const dy = posB.lat - posA.lat;
    const dvx = tileB.velocity.vx - tileA.velocity.vx;
    const dvy = tileB.velocity.vy - tileA.velocity.vy;
    
    // Check if velocities are approaching (dot product < 0)
    const approachRate = dx * dvx + dy * dvy;
    if (approachRate >= 0) return undefined; // Moving apart or parallel
    
    // Calculate time to closest approach
    const relativeSpeedSquared = dvx * dvx + dvy * dvy;
    if (relativeSpeedSquared < this.MIN_CONVERGENCE_SPEED * this.MIN_CONVERGENCE_SPEED) {
      return undefined; // Too slow to be meaningful
    }
    
    const timeToClosest = -approachRate / relativeSpeedSquared;
    
    // Only predict convergence within reasonable time window
    if (timeToClosest > this.MAX_CONVERGENCE_TIME) return undefined;
    
    // Calculate closest approach distance
    const closestDx = dx + dvx * timeToClosest;
    const closestDy = dy + dvy * timeToClosest;
    const closestDistance = Math.sqrt(closestDx * closestDx + closestDy * closestDy);
    
    // Convert to meters (approximate)
    const closestDistanceMeters = closestDistance * 111320;
    
    // Only consider it convergence if they get close enough
    if (closestDistanceMeters > 50) return undefined; // 50 meter threshold
    
    // Calculate probability based on momentum and confidence
    const probabilityA = (tileA.momentum || 0.5) * (tileA.velocity.confidence || 0.5);
    const probabilityB = (tileB.momentum || 0.5) * (tileB.velocity.confidence || 0.5);
    const timeFactor = Math.exp(-timeToClosest / 120); // Decay over 2 minutes
    const probability = probabilityA * probabilityB * timeFactor;
    
    return {
      target_tile_id: tileB.tile_id,
      time_to_converge: timeToClosest,
      probability: Math.min(1, probability)
    };
  }
  
  static predictMeetingPoint(a: EnhancedFieldTile, b: EnhancedFieldTile, timeSec: number):
    { lat: number; lng: number } | null
  {
    if (!a.velocity || !a.history?.[0]) return null;
    const origin = a.history[0].centroid;
    const latRad = origin.lat * Math.PI/180;
    const metersToLat = 1 / 111320;                  // ~m to deg
    const metersToLng = 1 / (111320 * Math.cos(latRad));

    const dx = a.velocity.vx * timeSec;              // east meters
    const dy = a.velocity.vy * timeSec;              // north meters

    const lng = origin.lng + dx * metersToLng;
    const lat = origin.lat + dy * metersToLat;
    return { lat, lng };
  }
  
  /**
   * Calculate Haversine distance between two points
   */
  private static haversineDistance(
    lat1: number, lng1: number, 
    lat2: number, lng2: number
  ): number {
    const R = 6371000; // Earth radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
}