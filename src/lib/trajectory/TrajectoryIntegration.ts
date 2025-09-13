import { socialCache } from '@/lib/social/socialCache';
import type { FriendHead, PathPoint } from '@/lib/social/socialCache';

/**
 * Integration layer between existing social tracking and new trajectory prediction
 */
export class TrajectoryIntegration {
  private static instance: TrajectoryIntegration;
  
  private constructor() {}
  
  static getInstance(): TrajectoryIntegration {
    if (!this.instance) {
      this.instance = new TrajectoryIntegration();
    }
    return this.instance;
  }

  /**
   * Enhanced friend heads with velocity estimation
   */
  getEnhancedFriendHeads(): Array<FriendHead & { velocity: { vx: number; vy: number; confidence: number } }> {
    const friends = socialCache.getFriendHeads();
    
    return friends.map(friend => ({
      ...friend,
      velocity: this.estimateVelocityFromPosition(friend)
    }));
  }

  /**
   * Enhanced user path with velocity calculations
   */
  getEnhancedUserPath(): Array<PathPoint & { velocity?: { vx: number; vy: number } }> {
    const path = socialCache.getMyPath();
    
    return path.map((point, index) => {
      if (index === 0) return point;
      
      const prevPoint = path[index - 1];
      const velocity = this.calculateVelocityBetweenPoints(prevPoint, point);
      
      return { ...point, velocity };
    });
  }

  /**
   * Update trajectory data for prediction engine
   */
  updateTrajectoryData(): void {
    // This method serves as a hook for the prediction engine to get updated data
    // The engine will call socialCache methods directly, but this provides
    // a centralized point for future enhancements
  }

  private estimateVelocityFromPosition(friend: FriendHead): { vx: number; vy: number; confidence: number } {
    // TODO: Implement velocity estimation from historical positions
    // For now, return zero velocity with low confidence
    const age = Date.now() - new Date(friend.t_head).getTime();
    const confidence = Math.max(0, 1 - age / 300000); // Decay over 5 minutes
    
    return { vx: 0, vy: 0, confidence };
  }

  private calculateVelocityBetweenPoints(prev: PathPoint, curr: PathPoint): { vx: number; vy: number } {
    const dt = ((curr.t || Date.now()) - (prev.t || Date.now())) / 1000; // seconds
    if (dt <= 0) return { vx: 0, vy: 0 };

    const dlat = curr.lat - prev.lat;
    const dlng = curr.lng - prev.lng;
    
    // Convert to meters per second
    const vy = (dlat * 111320) / dt; // north velocity
    const vx = (dlng * 111320 * Math.cos(curr.lat * Math.PI / 180)) / dt; // east velocity

    return { vx, vy };
  }
}