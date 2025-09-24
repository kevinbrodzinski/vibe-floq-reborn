// Multi-agent convergence detection and prediction system

export interface Agent {
  id: string;
  position: [number, number];
  velocity: [number, number];
  confidence: number;
  lastSeen: number;
}

export interface Venue {
  id: string;
  position: [number, number];
  type: string;
  popularity: number;
  name: string;
}

export interface ConvergenceResult {
  agentIds: string[];
  convergencePoint: [number, number];
  timeToMeet: number; // seconds
  probability: number;
  nearestVenue?: Venue;
}

export class MultiAgentConvergenceCalculator {
  private static readonly VENUE_MAGNETISM_FACTOR = 1.4;
  private static readonly MAX_CONVERGENCE_DISTANCE = 80; // meters
  private static readonly MIN_CONFIDENCE = 0.65;
  private static readonly MIN_SPEED_THRESHOLD = 0.3; // m/s minimum speed to consider
  private static readonly MAX_SPEED_THRESHOLD = 15; // m/s maximum reasonable walking/biking speed
  private static readonly STATIONARY_TIME_THRESHOLD = 45000; // 45s before considering stationary
  
  private static readonly TIME_OF_DAY_PATTERNS = {
    morning: { coffee: 1.8, cafe: 1.6, transit: 1.4, breakfast: 1.7, gym: 1.3 },
    lunch: { restaurant: 2.1, food: 1.9, park: 1.4, cafe: 1.5, coworking: 1.3 },
    evening: { bar: 1.6, restaurant: 1.7, entertainment: 1.8, park: 1.3, shopping: 1.2 },
    night: { bar: 2.2, club: 2.0, entertainment: 1.7, late_night: 1.8, casino: 1.5 }
  };

  private static readonly VENUE_POPULARITY_WEIGHTS = {
    high: 1.5,    // 80-100% popularity
    medium: 1.2,  // 50-79% popularity  
    low: 1.0      // Below 50% popularity
  };

  static detectConvergences(
    agents: Agent[],
    venues: Venue[] = [],
    maxPredictionTime = 180 // 3 minutes
  ): ConvergenceResult[] {
    const convergences: ConvergenceResult[] = [];
    const timeOfDay = this.getTimeOfDay();

    // Filter valid agents with movement validation
    const validAgents = agents.filter(agent => this.isValidMovingAgent(agent));
    
    if (validAgents.length < 2) return [];

    // Check all pairs of valid agents
    for (let i = 0; i < validAgents.length; i++) {
      for (let j = i + 1; j < validAgents.length; j++) {
        const pairConvergence = this.calculatePairConvergence(
          validAgents[i], 
          validAgents[j], 
          venues, 
          timeOfDay,
          maxPredictionTime
        );
        
        if (pairConvergence && pairConvergence.probability > this.MIN_CONFIDENCE) {
          convergences.push(pairConvergence);
        }

        // Check for 3+ agent convergences around pair intersection
        if (pairConvergence && validAgents.length > 2) {
          const tripleConvergences = this.findTripleConvergences(
            validAgents[i], 
            validAgents[j], 
            validAgents.filter((_, idx) => idx !== i && idx !== j),
            pairConvergence,
            venues,
            timeOfDay
          );
          convergences.push(...tripleConvergences);
        }
      }
    }

    return this.filterAndRankConvergences(convergences);
  }

  private static calculatePairConvergence(
    agent1: Agent,
    agent2: Agent,
    venues: Venue[],
    timeOfDay: string,
    maxTime: number
  ): ConvergenceResult | null {
    // Calculate trajectory intersection
    const intersection = this.findTrajectoryIntersection(
      agent1.position,
      agent1.velocity,
      agent2.position,
      agent2.velocity,
      maxTime
    );

    if (!intersection) return null;

    let probability = intersection.probability;
    let convergencePoint = intersection.point;
    
    // Apply enhanced venue magnetism with dynamic weighting
    const nearbyVenue = this.findNearestVenue(convergencePoint, venues);
    if (nearbyVenue && nearbyVenue.distance < 75) {
      const venueTypeMultiplier = this.TIME_OF_DAY_PATTERNS[timeOfDay]?.[nearbyVenue.type] || 1;
      const popularityWeight = this.getPopularityWeight(nearbyVenue.popularity);
      const distanceDecay = Math.exp(-nearbyVenue.distance / 30); // 30m decay
      
      const magnetism = this.VENUE_MAGNETISM_FACTOR * 
        popularityWeight * 
        venueTypeMultiplier * 
        distanceDecay;
      
      probability *= magnetism;
      
      // Stronger venue attraction for popular venues
      const venueWeight = Math.min(0.6, Math.max(0.1, (magnetism - 1) * 0.5));
      if (venueWeight > 0.1) {
        convergencePoint = this.weightedAverage(
          convergencePoint,
          nearbyVenue.position,
          1 - venueWeight,
          venueWeight
        );
      }
    }

    // Apply confidence weighting
    probability *= agent1.confidence * agent2.confidence;

    // Age penalty for stale data
    const age1 = Date.now() - agent1.lastSeen;
    const age2 = Date.now() - agent2.lastSeen;
    const agePenalty = Math.exp(-(age1 + age2) / 60000); // Decay over 1 minute
    probability *= agePenalty;

    return {
      agentIds: [agent1.id, agent2.id],
      convergencePoint,
      timeToMeet: intersection.time,
      probability: Math.min(probability, 1),
      nearestVenue: nearbyVenue?.distance < 50 ? {
        id: nearbyVenue.id,
        position: nearbyVenue.position,
        type: nearbyVenue.type,
        popularity: nearbyVenue.popularity,
        name: nearbyVenue.name
      } : undefined
    };
  }

  private static findTripleConvergences(
    agent1: Agent,
    agent2: Agent,
    otherAgents: Agent[],
    baseConvergence: ConvergenceResult,
    venues: Venue[],
    timeOfDay: string
  ): ConvergenceResult[] {
    const tripleConvergences: ConvergenceResult[] = [];

    for (const agent3 of otherAgents) {
      // Predict where agent3 will be at the time of base convergence
      const predictedPos = this.predictPosition(
        agent3.position,
        agent3.velocity,
        baseConvergence.timeToMeet
      );

      const distance = this.calculateDistance(baseConvergence.convergencePoint, predictedPos);
      
      if (distance < this.MAX_CONVERGENCE_DISTANCE) {
        // Calculate centroid of three agents
        const centroid = this.calculateCentroid([
          baseConvergence.convergencePoint,
          predictedPos
        ]);

        // Calculate probability based on spatial cohesion
        const spatialCohesion = Math.exp(-distance / 50); // 50m decay
        const probability = baseConvergence.probability * spatialCohesion * agent3.confidence * 0.8;

        if (probability > this.MIN_CONFIDENCE) {
          tripleConvergences.push({
            agentIds: [...baseConvergence.agentIds, agent3.id],
            convergencePoint: centroid,
            timeToMeet: baseConvergence.timeToMeet,
            probability,
            nearestVenue: baseConvergence.nearestVenue
          });
        }
      }
    }

    return tripleConvergences;
  }

  private static findTrajectoryIntersection(
    p1: [number, number],
    v1: [number, number],
    p2: [number, number],
    v2: [number, number],
    maxTime: number
  ): { point: [number, number]; time: number; probability: number } | null {
    // Find closest approach between two trajectories
    const relativeVel = [v2[0] - v1[0], v2[1] - v1[1]];
    const relativePos = [p2[0] - p1[0], p2[1] - p1[1]];
    
    // Time of closest approach
    const velMagSq = relativeVel[0] * relativeVel[0] + relativeVel[1] * relativeVel[1];
    
    if (velMagSq < 0.01) return null; // Parallel or stationary

    const timeToClosest = -(relativePos[0] * relativeVel[0] + relativePos[1] * relativeVel[1]) / velMagSq;
    
    if (timeToClosest < 0 || timeToClosest > maxTime) return null;

    // Position at closest approach
    const p1AtTime = this.predictPosition(p1, v1, timeToClosest);
    const p2AtTime = this.predictPosition(p2, v2, timeToClosest);
    
    const distance = this.calculateDistance(p1AtTime, p2AtTime);
    
    if (distance > this.MAX_CONVERGENCE_DISTANCE) return null;

    // Calculate intersection point (midpoint)
    const intersectionPoint: [number, number] = [
      (p1AtTime[0] + p2AtTime[0]) / 2,
      (p1AtTime[1] + p2AtTime[1]) / 2
    ];

    // Probability based on distance and time
    const distanceProb = Math.exp(-distance / 30); // 30m decay
    const timeProb = Math.exp(-timeToClosest / 120); // 2min decay
    
    return {
      point: intersectionPoint,
      time: timeToClosest,
      probability: distanceProb * timeProb
    };
  }

  private static predictPosition(
    position: [number, number],
    velocity: [number, number],
    time: number
  ): [number, number] {
    return [
      position[0] + velocity[0] * time / 111320, // Convert m/s to degrees
      position[1] + velocity[1] * time / 111320
    ];
  }

  private static calculateDistance(p1: [number, number], p2: [number, number]): number {
    const R = 6371000; // Earth radius in meters
    const lat1 = p1[1] * Math.PI / 180;
    const lat2 = p2[1] * Math.PI / 180;
    const deltaLat = (p2[1] - p1[1]) * Math.PI / 180;
    const deltaLng = (p2[0] - p1[0]) * Math.PI / 180;

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) *
      Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  private static findNearestVenue(
    point: [number, number], 
    venues: Venue[]
  ): (Venue & { distance: number }) | null {
    if (!venues.length) return null;

    let nearest: (Venue & { distance: number }) | null = null;
    let minDistance = Infinity;

    for (const venue of venues) {
      const distance = this.calculateDistance(point, venue.position);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = { ...venue, distance };
      }
    }

    return nearest;
  }

  private static calculateCentroid(points: [number, number][]): [number, number] {
    const sum = points.reduce(
      (acc, point) => [acc[0] + point[0], acc[1] + point[1]],
      [0, 0]
    );
    return [sum[0] / points.length, sum[1] / points.length];
  }

  private static weightedAverage(
    p1: [number, number],
    p2: [number, number],
    w1: number,
    w2: number
  ): [number, number] {
    return [
      p1[0] * w1 + p2[0] * w2,
      p1[1] * w1 + p2[1] * w2
    ];
  }

  private static filterAndRankConvergences(convergences: ConvergenceResult[]): ConvergenceResult[] {
    // Remove low-probability convergences
    const filtered = convergences.filter(c => c.probability > this.MIN_CONFIDENCE);

    // Sort by probability, then time to meet, then group size
    filtered.sort((a, b) => {
      const probDiff = b.probability - a.probability;
      if (Math.abs(probDiff) > 0.1) return probDiff;
      
      const timeDiff = a.timeToMeet - b.timeToMeet;
      if (Math.abs(timeDiff) > 30) return timeDiff;
      
      return b.agentIds.length - a.agentIds.length;
    });

    // Return top 3 convergences to avoid spam
    return filtered.slice(0, 3);
  }

  // Advanced movement validation
  private static isValidMovingAgent(agent: Agent): boolean {
    const speed = Math.sqrt(agent.velocity[0] * agent.velocity[0] + agent.velocity[1] * agent.velocity[1]) * 111320; // Convert to m/s
    const age = Date.now() - agent.lastSeen;
    
    // Filter out stationary, too fast, or stale agents
    return speed >= this.MIN_SPEED_THRESHOLD && 
           speed <= this.MAX_SPEED_THRESHOLD &&
           age < this.STATIONARY_TIME_THRESHOLD &&
           agent.confidence > 0.4;
  }

  private static getPopularityWeight(popularity: number): number {
    if (popularity >= 80) return this.VENUE_POPULARITY_WEIGHTS.high;
    if (popularity >= 50) return this.VENUE_POPULARITY_WEIGHTS.medium;
    return this.VENUE_POPULARITY_WEIGHTS.low;
  }

  private static getTimeOfDay(): string {
    const hour = new Date().getHours();
    if (hour < 11) return 'morning';
    if (hour < 15) return 'lunch';
    if (hour < 19) return 'evening';
    return 'night';
  }
}