/**
 * Enhanced Proximity Confidence Scoring System
 * Factors in GPS accuracy, implements hysteresis, and validates temporal proximity patterns
 */

import { GPSCoords, calculateDistance } from './standardGeo';

export interface ProximityUser {
  userId: string;
  location: GPSCoords;
  accuracy: number;
  timestamp: number;
  vibe?: string;
}

export interface ProximityEvent {
  userId: string;
  targetUserId: string;
  eventType: 'enter' | 'exit' | 'sustain';
  distance: number;
  confidence: number;
  timestamp: number;
  duration?: number; // for sustain events
}

export interface ProximityHistory {
  userId: string;
  targetUserId: string;
  events: ProximityEvent[];
  currentState: 'near' | 'far' | 'unknown';
  lastUpdate: number;
  sustainedDuration: number; // milliseconds of sustained proximity
}

export interface ProximityAnalysis {
  distance: number;
  confidence: number;
  isNear: boolean;
  wasNear: boolean;
  eventType: 'enter' | 'exit' | 'sustain' | 'none';
  sustainedDuration: number;
  reliability: 'high' | 'medium' | 'low';
}

/**
 * Enhanced proximity scoring service with hysteresis and temporal validation
 */
export class ProximityScorer {
  private proximityHistory: Map<string, ProximityHistory> = new Map();
  
  // Proximity thresholds with hysteresis
  private readonly ENTER_THRESHOLD = 100; // meters - threshold to enter proximity
  private readonly EXIT_THRESHOLD = 150; // meters - threshold to exit proximity (higher for hysteresis)
  private readonly MIN_SUSTAIN_DURATION = 30000; // 30 seconds minimum for sustained proximity
  private readonly MAX_HISTORY_AGE = 24 * 60 * 60 * 1000; // 24 hours
  private readonly CONFIDENCE_DECAY_TIME = 5 * 60 * 1000; // 5 minutes
  
  // Accuracy factors
  private readonly MIN_ACCURACY_FOR_HIGH_CONFIDENCE = 20; // meters
  private readonly MAX_ACCURACY_FOR_ANY_CONFIDENCE = 200; // meters

  /**
   * Analyze proximity between two users with enhanced confidence scoring
   */
  analyzeProximity(
    user1: ProximityUser,
    user2: ProximityUser
  ): ProximityAnalysis {
    const historyKey = this.getHistoryKey(user1.userId, user2.userId);
    const history = this.proximityHistory.get(historyKey) || this.createNewHistory(user1.userId, user2.userId);
    
    // Calculate basic distance and confidence
    const distance = calculateDistance(user1.location, user2.location);
    const confidence = this.calculateProximityConfidence(user1, user2, distance);
    
    // Determine current proximity state using hysteresis
    const wasNear = history.currentState === 'near';
    const threshold = wasNear ? this.EXIT_THRESHOLD : this.ENTER_THRESHOLD;
    const isNear = distance <= threshold && confidence > 0.3;
    
    // Determine event type
    let eventType: 'enter' | 'exit' | 'sustain' | 'none' = 'none';
    let sustainedDuration = 0;
    
    if (isNear && !wasNear) {
      eventType = 'enter';
      history.sustainedDuration = 0;
    } else if (!isNear && wasNear) {
      eventType = 'exit';
      sustainedDuration = history.sustainedDuration;
      history.sustainedDuration = 0;
    } else if (isNear && wasNear) {
      const timeSinceLastUpdate = user1.timestamp - history.lastUpdate;
      history.sustainedDuration += timeSinceLastUpdate;
      
      if (history.sustainedDuration >= this.MIN_SUSTAIN_DURATION) {
        eventType = 'sustain';
        sustainedDuration = history.sustainedDuration;
      }
    }
    
    // Update history
    if (eventType !== 'none') {
      const event: ProximityEvent = {
        userId: user1.userId,
        targetUserId: user2.userId,
        eventType,
        distance,
        confidence,
        timestamp: user1.timestamp,
        duration: eventType === 'sustain' || eventType === 'exit' ? sustainedDuration : undefined
      };
      
      history.events.push(event);
      history.currentState = isNear ? 'near' : 'far';
      history.lastUpdate = user1.timestamp;
      
      // Trim old events
      this.trimHistory(history);
    }
    
    // Update history in map
    this.proximityHistory.set(historyKey, history);
    
    // Calculate reliability based on GPS accuracy and temporal consistency
    const reliability = this.calculateReliability(user1, user2, history);
    
    return {
      distance,
      confidence,
      isNear,
      wasNear,
      eventType,
      sustainedDuration: history.sustainedDuration,
      reliability
    };
  }

  /**
   * Calculate proximity confidence based on GPS accuracy of both users
   */
  private calculateProximityConfidence(
    user1: ProximityUser,
    user2: ProximityUser,
    distance: number
  ): number {
    // Factor in GPS accuracy uncertainty
    const combinedAccuracy = Math.sqrt(user1.accuracy ** 2 + user2.accuracy ** 2);
    
    // If combined accuracy is too poor, confidence is very low
    if (combinedAccuracy > this.MAX_ACCURACY_FOR_ANY_CONFIDENCE) {
      return 0.1;
    }
    
    // Calculate distance confidence (how certain we are about the distance)
    let distanceConfidence = 1.0;
    if (distance < combinedAccuracy) {
      // Very close - high uncertainty due to GPS accuracy overlap
      distanceConfidence = 0.5;
    } else if (distance < combinedAccuracy * 2) {
      // Moderate uncertainty
      distanceConfidence = 0.7;
    }
    
    // Calculate accuracy confidence (how good the GPS readings are)
    const avgAccuracy = (user1.accuracy + user2.accuracy) / 2;
    const accuracyConfidence = Math.max(0.1, 
      1 - (avgAccuracy - this.MIN_ACCURACY_FOR_HIGH_CONFIDENCE) / 
      (this.MAX_ACCURACY_FOR_ANY_CONFIDENCE - this.MIN_ACCURACY_FOR_HIGH_CONFIDENCE)
    );
    
    // Factor in timestamp freshness
    const now = Date.now();
    const user1Freshness = Math.max(0, 1 - (now - user1.timestamp) / this.CONFIDENCE_DECAY_TIME);
    const user2Freshness = Math.max(0, 1 - (now - user2.timestamp) / this.CONFIDENCE_DECAY_TIME);
    const temporalConfidence = Math.min(user1Freshness, user2Freshness);
    
    // Combine all confidence factors
    return distanceConfidence * accuracyConfidence * temporalConfidence;
  }

  /**
   * Calculate reliability rating based on GPS quality and temporal patterns
   */
  private calculateReliability(
    user1: ProximityUser,
    user2: ProximityUser,
    history: ProximityHistory
  ): 'high' | 'medium' | 'low' {
    const avgAccuracy = (user1.accuracy + user2.accuracy) / 2;
    const recentEvents = history.events.filter(e => 
      user1.timestamp - e.timestamp < 10 * 60 * 1000 // Last 10 minutes
    );
    
    // High reliability: Good GPS accuracy and consistent readings
    if (avgAccuracy <= this.MIN_ACCURACY_FOR_HIGH_CONFIDENCE && recentEvents.length >= 2) {
      const consistentReadings = recentEvents.every(e => e.confidence > 0.7);
      if (consistentReadings) return 'high';
    }
    
    // Medium reliability: Decent accuracy or some consistency
    if (avgAccuracy <= 50 || recentEvents.length >= 1) {
      return 'medium';
    }
    
    // Low reliability: Poor accuracy and inconsistent readings
    return 'low';
  }

  /**
   * Get proximity history for a user pair
   */
  getProximityHistory(userId1: string, userId2: string): ProximityHistory | null {
    const historyKey = this.getHistoryKey(userId1, userId2);
    return this.proximityHistory.get(historyKey) || null;
  }

  /**
   * Get all current proximity states for a user
   */
  getCurrentProximities(userId: string): { targetUserId: string; state: ProximityHistory }[] {
    const proximities: { targetUserId: string; state: ProximityHistory }[] = [];
    
    for (const [key, history] of this.proximityHistory) {
      if (history.userId === userId || history.targetUserId === userId) {
        const targetUserId = history.userId === userId ? history.targetUserId : history.userId;
        proximities.push({ targetUserId, state: history });
      }
    }
    
    return proximities.filter(p => p.state.currentState === 'near');
  }

  /**
   * Clean up old proximity history
   */
  cleanupOldHistory(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    for (const [key, history] of this.proximityHistory) {
      if (now - history.lastUpdate > this.MAX_HISTORY_AGE) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.proximityHistory.delete(key));
  }

  /**
   * Get proximity statistics for analysis
   */
  getProximityStats(userId: string): {
    totalProximityEvents: number;
    averageSustainedDuration: number;
    mostFrequentProximityPartner: string | null;
    reliabilityDistribution: { high: number; medium: number; low: number };
  } {
    let totalEvents = 0;
    let totalSustainedDuration = 0;
    let sustainedEventCount = 0;
    const partnerCounts: Map<string, number> = new Map();
    const reliabilityCount = { high: 0, medium: 0, low: 0 };
    
    for (const history of this.proximityHistory.values()) {
      if (history.userId === userId || history.targetUserId === userId) {
        const partnerId = history.userId === userId ? history.targetUserId : history.userId;
        
        totalEvents += history.events.length;
        partnerCounts.set(partnerId, (partnerCounts.get(partnerId) || 0) + 1);
        
        for (const event of history.events) {
          if (event.eventType === 'sustain' || event.eventType === 'exit') {
            if (event.duration) {
              totalSustainedDuration += event.duration;
              sustainedEventCount++;
            }
          }
        }
      }
    }
    
    const mostFrequentPartner = partnerCounts.size > 0 
      ? Array.from(partnerCounts.entries()).reduce((a, b) => a[1] > b[1] ? a : b)[0]
      : null;
    
    return {
      totalProximityEvents: totalEvents,
      averageSustainedDuration: sustainedEventCount > 0 ? totalSustainedDuration / sustainedEventCount : 0,
      mostFrequentProximityPartner: mostFrequentPartner,
      reliabilityDistribution: reliabilityCount
    };
  }

  /**
   * Create a consistent history key for user pairs
   */
  private getHistoryKey(userId1: string, userId2: string): string {
    return userId1 < userId2 ? `${userId1}_${userId2}` : `${userId2}_${userId1}`;
  }

  /**
   * Create new proximity history record
   */
  private createNewHistory(userId1: string, userId2: string): ProximityHistory {
    return {
      userId: userId1,
      targetUserId: userId2,
      events: [],
      currentState: 'unknown',
      lastUpdate: Date.now(),
      sustainedDuration: 0
    };
  }

  /**
   * Remove old events from history to prevent memory growth
   */
  private trimHistory(history: ProximityHistory): void {
    const cutoff = Date.now() - this.MAX_HISTORY_AGE;
    history.events = history.events.filter(event => event.timestamp > cutoff);
  }
}

/**
 * Batch proximity analysis for multiple users
 */
export class BatchProximityAnalyzer {
  private proximityScorer: ProximityScorer;
  
  constructor() {
    this.proximityScorer = new ProximityScorer();
  }

  /**
   * Analyze proximity for all user pairs in a group
   */
  analyzeGroupProximity(users: ProximityUser[]): Map<string, ProximityAnalysis[]> {
    const results = new Map<string, ProximityAnalysis[]>();
    
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const proximities: ProximityAnalysis[] = [];
      
      for (let j = 0; j < users.length; j++) {
        if (i !== j) {
          const otherUser = users[j];
          const analysis = this.proximityScorer.analyzeProximity(user, otherUser);
          
          if (analysis.confidence > 0.1) { // Only include meaningful proximities
            proximities.push({
              ...analysis,
              // Add target user ID for reference
              targetUserId: otherUser.userId
            } as ProximityAnalysis & { targetUserId: string });
          }
        }
      }
      
      results.set(user.userId, proximities);
    }
    
    return results;
  }

  /**
   * Get proximity events that should trigger notifications
   */
  getNotifiableEvents(users: ProximityUser[]): ProximityEvent[] {
    const notifiableEvents: ProximityEvent[] = [];
    const groupAnalysis = this.analyzeGroupProximity(users);
    
    for (const [userId, proximities] of groupAnalysis) {
      for (const proximity of proximities) {
        if (proximity.eventType === 'enter' && proximity.confidence > 0.6) {
          // High-confidence proximity enter events are notifiable
          const history = this.proximityScorer.getProximityHistory(
            userId, 
            (proximity as any).targetUserId
          );
          
          if (history) {
            const lastEvent = history.events[history.events.length - 1];
            if (lastEvent) {
              notifiableEvents.push(lastEvent);
            }
          }
        }
      }
    }
    
    return notifiableEvents;
  }

  /**
   * Get the proximity scorer instance for direct access
   */
  getProximityScorer(): ProximityScorer {
    return this.proximityScorer;
  }
}

// Singleton instances
export const proximityScorer = new ProximityScorer();
export const batchProximityAnalyzer = new BatchProximityAnalyzer();