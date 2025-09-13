import { SocialPhysicsCalculator } from '@/lib/field/physics';
import { socialCache, type FriendHead, type PathPoint } from '@/lib/social/socialCache';
import type { EnhancedFieldTile } from '../../../packages/types/domain/enhanced-field';

export interface PersonTrajectory {
  profileId: string;
  currentPosition: { lat: number; lng: number };
  velocity: { vx: number; vy: number }; // m/s
  confidence: number;
  lastUpdate: number;
  friendName?: string;
}

export interface ConvergenceEvent {
  id: string;
  participants: string[];
  meetingPoint: { lat: number; lng: number };
  timeToMeet: number; // seconds
  probability: number;
  type: 'pair' | 'group';
  confidence: number;
}

/**
 * Enhanced convergence prediction for real-time trajectory intersections
 * Builds on SocialPhysicsCalculator with multi-agent and friend-based predictions
 */
export class ConvergencePredictionEngine {
  private static readonly MAX_PREDICTION_TIME = 180; // 3 minutes
  private static readonly MIN_PROBABILITY_THRESHOLD = 0.75;
  private static readonly POSITION_CONFIDENCE_DECAY = 0.95; // per second
  private static readonly VENUE_MAGNETISM_RADIUS = 100; // meters

  /**
   * Get current trajectories from friend heads and user position
   */
  static getCurrentTrajectories(): PersonTrajectory[] {
    const trajectories: PersonTrajectory[] = [];
    const friends = socialCache.getFriendHeads();
    const myPath = socialCache.getMyPath();

    // Add friend trajectories
    friends.forEach((friend, index) => {
      const age = Date.now() - new Date(friend.t_head).getTime();
      const confidence = Math.pow(this.POSITION_CONFIDENCE_DECAY, age / 1000);
      
      if (confidence > 0.1) { // Only include recent positions
        trajectories.push({
          profileId: `friend-${index}`,
          currentPosition: { lat: friend.lat, lng: friend.lng },
          velocity: this.estimateVelocity(friend, friends),
          confidence,
          lastUpdate: new Date(friend.t_head).getTime(),
          friendName: `Friend ${index + 1}`
        });
      }
    });

    // Add user trajectory
    if (myPath.length >= 2) {
      const latest = myPath[myPath.length - 1];
      const previous = myPath[myPath.length - 2];
      
      trajectories.push({
        profileId: 'me',
        currentPosition: { lat: latest.lat, lng: latest.lng },
        velocity: this.calculateVelocityFromPath(previous, latest),
        confidence: 0.9,
        lastUpdate: latest.t || Date.now()
      });
    }

    return trajectories;
  }

  /**
   * Detect upcoming convergence events
   */
  static detectUpcomingConvergences(): ConvergenceEvent[] {
    const trajectories = this.getCurrentTrajectories();
    const events: ConvergenceEvent[] = [];

    // Check all pairs
    for (let i = 0; i < trajectories.length; i++) {
      for (let j = i + 1; j < trajectories.length; j++) {
        const pairEvent = this.analyzePairConvergence(trajectories[i], trajectories[j]);
        if (pairEvent) {
          events.push(pairEvent);
        }
      }
    }

    // Check for 3+ person convergences
    const groupEvents = this.analyzeGroupConvergences(trajectories);
    events.push(...groupEvents);

    // Sort by probability and imminent time
    return events
      .filter(e => e.probability >= this.MIN_PROBABILITY_THRESHOLD)
      .sort((a, b) => {
        if (Math.abs(a.probability - b.probability) > 0.1) {
          return b.probability - a.probability;
        }
        return a.timeToMeet - b.timeToMeet;
      })
      .slice(0, 3); // Limit to top 3 predictions
  }

  /**
   * Analyze convergence between two people
   */
  private static analyzePairConvergence(
    personA: PersonTrajectory, 
    personB: PersonTrajectory
  ): ConvergenceEvent | null {
    const dx = personB.currentPosition.lng - personA.currentPosition.lng;
    const dy = personB.currentPosition.lat - personA.currentPosition.lat;
    const dvx = personB.velocity.vx - personA.velocity.vx;
    const dvy = personB.velocity.vy - personA.velocity.vy;

    // Check if approaching
    const approachRate = dx * dvx + dy * dvy;
    if (approachRate >= 0) return null;

    // Calculate time to closest approach
    const relativeSpeedSquared = dvx * dvx + dvy * dvy;
    if (relativeSpeedSquared < 0.01) return null; // Too slow

    const timeToClosest = -approachRate / relativeSpeedSquared;
    if (timeToClosest > this.MAX_PREDICTION_TIME) return null;

    // Calculate meeting point
    const meetingLat = personA.currentPosition.lat + personA.velocity.vy * timeToClosest / 111320;
    const meetingLng = personA.currentPosition.lng + personA.velocity.vx * timeToClosest / (111320 * Math.cos(meetingLat * Math.PI / 180));

    // Calculate closest distance
    const closestDx = dx + dvx * timeToClosest;
    const closestDy = dy + dvy * timeToClosest;
    const closestDistance = Math.sqrt(closestDx * closestDx + closestDy * closestDy) * 111320;

    if (closestDistance > 50) return null; // Too far apart

    // Calculate probability with venue magnetism and confidence factors
    const baseProb = personA.confidence * personB.confidence;
    const timeFactor = Math.exp(-timeToClosest / 120);
    const venueFactor = this.getVenueMagnetismFactor(meetingLat, meetingLng);
    const probability = baseProb * timeFactor * venueFactor;

    return {
      id: `pair-${personA.profileId}-${personB.profileId}`,
      participants: [personA.profileId, personB.profileId],
      meetingPoint: { lat: meetingLat, lng: meetingLng },
      timeToMeet: timeToClosest,
      probability: Math.min(1, probability),
      type: 'pair',
      confidence: Math.min(personA.confidence, personB.confidence)
    };
  }

  /**
   * Analyze group convergences (3+ people)
   */
  private static analyzeGroupConvergences(trajectories: PersonTrajectory[]): ConvergenceEvent[] {
    if (trajectories.length < 3) return [];

    const events: ConvergenceEvent[] = [];
    
    // Find potential group meeting points by analyzing trajectory intersections
    for (let i = 0; i < trajectories.length; i++) {
      for (let j = i + 1; j < trajectories.length; j++) {
        for (let k = j + 1; k < trajectories.length; k++) {
          const groupEvent = this.analyzeTripleConvergence([
            trajectories[i], trajectories[j], trajectories[k]
          ]);
          if (groupEvent) {
            events.push(groupEvent);
          }
        }
      }
    }

    return events;
  }

  /**
   * Analyze convergence for 3 people
   */
  private static analyzeTripleConvergence(people: [PersonTrajectory, PersonTrajectory, PersonTrajectory]): ConvergenceEvent | null {
    // Calculate potential meeting points for each pair
    const pair1 = this.analyzePairConvergence(people[0], people[1]);
    const pair2 = this.analyzePairConvergence(people[1], people[2]);
    const pair3 = this.analyzePairConvergence(people[0], people[2]);

    if (!pair1 || !pair2 || !pair3) return null;

    // Check if meeting points are close to each other
    const avgLat = (pair1.meetingPoint.lat + pair2.meetingPoint.lat + pair3.meetingPoint.lat) / 3;
    const avgLng = (pair1.meetingPoint.lng + pair2.meetingPoint.lng + pair3.meetingPoint.lng) / 3;
    const avgTime = (pair1.timeToMeet + pair2.timeToMeet + pair3.timeToMeet) / 3;

    // Check spatial convergence of meeting points
    const maxDistance = Math.max(
      this.haversineDistance(pair1.meetingPoint.lat, pair1.meetingPoint.lng, avgLat, avgLng),
      this.haversineDistance(pair2.meetingPoint.lat, pair2.meetingPoint.lng, avgLat, avgLng),
      this.haversineDistance(pair3.meetingPoint.lat, pair3.meetingPoint.lng, avgLat, avgLng)
    );

    if (maxDistance > 30) return null; // Meeting points too spread out

    // Check temporal convergence
    const maxTimeDiff = Math.max(
      Math.abs(pair1.timeToMeet - avgTime),
      Math.abs(pair2.timeToMeet - avgTime), 
      Math.abs(pair3.timeToMeet - avgTime)
    );

    if (maxTimeDiff > 30) return null; // Times too spread out

    const avgProbability = (pair1.probability + pair2.probability + pair3.probability) / 3;
    const groupBonus = 1.2; // Bonus for group convergence

    return {
      id: `group-${people.map(p => p.profileId).join('-')}`,
      participants: people.map(p => p.profileId),
      meetingPoint: { lat: avgLat, lng: avgLng },
      timeToMeet: avgTime,
      probability: Math.min(1, avgProbability * groupBonus),
      type: 'group',
      confidence: Math.min(...people.map(p => p.confidence))
    };
  }

  /**
   * Estimate velocity for a friend based on position history
   */
  private static estimateVelocity(friend: FriendHead, allFriends: FriendHead[]): { vx: number; vy: number } {
    // Simple estimation - in real implementation, this would use historical data
    // For now, assume stationary or slow movement
    return { vx: 0, vy: 0 };
  }

  /**
   * Calculate velocity from path points
   */
  private static calculateVelocityFromPath(prev: PathPoint, curr: PathPoint): { vx: number; vy: number } {
    const dt = ((curr.t || Date.now()) - (prev.t || Date.now())) / 1000; // seconds
    if (dt <= 0) return { vx: 0, vy: 0 };

    const dlat = curr.lat - prev.lat;
    const dlng = curr.lng - prev.lng;
    
    // Convert to meters per second
    const vy = (dlat * 111320) / dt; // north velocity
    const vx = (dlng * 111320 * Math.cos(curr.lat * Math.PI / 180)) / dt; // east velocity

    return { vx, vy };
  }

  /**
   * Get venue magnetism factor (higher near popular venues)
   */
  private static getVenueMagnetismFactor(lat: number, lng: number): number {
    // TODO: Integrate with venue data to boost probability near popular venues
    // For now, return neutral factor
    return 1.0;
  }

  /**
   * Calculate Haversine distance between two points
   */
  private static haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
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