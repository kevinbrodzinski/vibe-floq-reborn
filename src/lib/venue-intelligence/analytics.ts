export interface RecommendationAnalytics {
  // Performance metrics
  fetchTime: number;
  cacheHitRate: number;
  errorRate: number;
  
  // Quality metrics
  averageConfidence: number;
  dataQualityDistribution: {
    high: number;
    medium: number;
    low: number;
  };
  
  // User interaction metrics
  clickThroughRate: number;
  favoriteRate: number;
  visitRate: number;
  
  // Recommendation effectiveness
  vibeMatchAccuracy: number;
  socialProofRelevance: number;
  crowdIntelligenceAccuracy: number;
}

export interface RecommendationEvent {
  type: 'view' | 'click' | 'favorite' | 'visit' | 'share';
  venueId: string;
  userId: string;
  recommendationId: string;
  confidence: number;
  vibeMatchScore: number;
  socialProofScore: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

class VenueRecommendationAnalytics {
  private events: RecommendationEvent[] = [];
  private maxEvents = 1000; // Keep last 1000 events in memory

  // Track recommendation events
  trackEvent(event: Omit<RecommendationEvent, 'timestamp'>): void {
    const fullEvent: RecommendationEvent = {
      ...event,
      timestamp: Date.now()
    };

    this.events.push(fullEvent);

    // Keep only recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Send to external analytics if needed
    this.sendToAnalytics(fullEvent);
  }

  // Calculate performance metrics
  getAnalytics(timeWindowMs: number = 24 * 60 * 60 * 1000): RecommendationAnalytics {
    const now = Date.now();
    const recentEvents = this.events.filter(e => now - e.timestamp <= timeWindowMs);

    if (recentEvents.length === 0) {
      return this.getEmptyAnalytics();
    }

    const views = recentEvents.filter(e => e.type === 'view');
    const clicks = recentEvents.filter(e => e.type === 'click');
    const favorites = recentEvents.filter(e => e.type === 'favorite');
    const visits = recentEvents.filter(e => e.type === 'visit');

    // Calculate rates
    const clickThroughRate = views.length > 0 ? clicks.length / views.length : 0;
    const favoriteRate = views.length > 0 ? favorites.length / views.length : 0;
    const visitRate = views.length > 0 ? visits.length / views.length : 0;

    // Calculate quality metrics
    const averageConfidence = recentEvents.reduce((sum, e) => sum + e.confidence, 0) / recentEvents.length;
    const averageVibeMatch = recentEvents.reduce((sum, e) => sum + e.vibeMatchScore, 0) / recentEvents.length;
    const averageSocialProof = recentEvents.reduce((sum, e) => sum + e.socialProofScore, 0) / recentEvents.length;

    // Data quality distribution (mock for now - would be calculated from actual data)
    const dataQualityDistribution = {
      high: Math.round(recentEvents.length * 0.4),
      medium: Math.round(recentEvents.length * 0.4),
      low: Math.round(recentEvents.length * 0.2)
    };

    return {
      fetchTime: 0, // Would be tracked separately
      cacheHitRate: 0, // Would be tracked separately
      errorRate: 0, // Would be tracked separately
      averageConfidence,
      dataQualityDistribution,
      clickThroughRate,
      favoriteRate,
      visitRate,
      vibeMatchAccuracy: averageVibeMatch,
      socialProofRelevance: averageSocialProof,
      crowdIntelligenceAccuracy: 0.8 // Mock value
    };
  }

  // Get recommendation effectiveness by venue
  getVenuePerformance(venueId: string): {
    views: number;
    clicks: number;
    favorites: number;
    visits: number;
    averageConfidence: number;
  } {
    const venueEvents = this.events.filter(e => e.venueId === venueId);
    
    return {
      views: venueEvents.filter(e => e.type === 'view').length,
      clicks: venueEvents.filter(e => e.type === 'click').length,
      favorites: venueEvents.filter(e => e.type === 'favorite').length,
      visits: venueEvents.filter(e => e.type === 'visit').length,
      averageConfidence: venueEvents.length > 0 
        ? venueEvents.reduce((sum, e) => sum + e.confidence, 0) / venueEvents.length 
        : 0
    };
  }

  // Get user engagement patterns
  getUserEngagement(userId: string): {
    totalViews: number;
    engagementRate: number;
    preferredVibeRange: { min: number; max: number };
    mostEngagedCategories: string[];
  } {
    const userEvents = this.events.filter(e => e.userId === userId);
    const engagementEvents = userEvents.filter(e => ['click', 'favorite', 'visit'].includes(e.type));
    
    const vibeScores = userEvents.map(e => e.vibeMatchScore);
    const preferredVibeRange = {
      min: Math.min(...vibeScores),
      max: Math.max(...vibeScores)
    };

    return {
      totalViews: userEvents.filter(e => e.type === 'view').length,
      engagementRate: userEvents.length > 0 ? engagementEvents.length / userEvents.length : 0,
      preferredVibeRange,
      mostEngagedCategories: [] // Would extract from metadata
    };
  }

  private getEmptyAnalytics(): RecommendationAnalytics {
    return {
      fetchTime: 0,
      cacheHitRate: 0,
      errorRate: 0,
      averageConfidence: 0,
      dataQualityDistribution: { high: 0, medium: 0, low: 0 },
      clickThroughRate: 0,
      favoriteRate: 0,
      visitRate: 0,
      vibeMatchAccuracy: 0,
      socialProofRelevance: 0,
      crowdIntelligenceAccuracy: 0
    };
  }

  private sendToAnalytics(event: RecommendationEvent): void {
    // In production, this would send to your analytics service
    // For now, just log significant events
    if (['favorite', 'visit'].includes(event.type)) {
      console.log('[VenueRecommendations] High-value event:', {
        type: event.type,
        venueId: event.venueId,
        confidence: event.confidence,
        vibeMatchScore: event.vibeMatchScore
      });
    }
  }

  // Clear old events
  cleanup(): void {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    this.events = this.events.filter(e => e.timestamp > oneWeekAgo);
  }

  // Export events for external analysis
  exportEvents(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = ['timestamp', 'type', 'venueId', 'userId', 'confidence', 'vibeMatchScore', 'socialProofScore'];
      const rows = this.events.map(e => [
        new Date(e.timestamp).toISOString(),
        e.type,
        e.venueId,
        e.userId,
        e.confidence.toFixed(3),
        e.vibeMatchScore.toFixed(3),
        e.socialProofScore.toFixed(3)
      ]);
      
      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
    
    return JSON.stringify(this.events, null, 2);
  }
}

// Global analytics instance
export const venueAnalytics = new VenueRecommendationAnalytics();

// Convenience functions for tracking
export const trackRecommendationView = (venueId: string, userId: string, recommendation: any) => {
  venueAnalytics.trackEvent({
    type: 'view',
    venueId,
    userId,
    recommendationId: `${userId}-${venueId}-${Date.now()}`,
    confidence: recommendation.confidence || 0,
    vibeMatchScore: recommendation.vibeMatch?.score || 0,
    socialProofScore: recommendation.socialProof?.friendVisits ? 
      Math.min(1, recommendation.socialProof.friendVisits / 10) : 0,
    metadata: {
      category: recommendation.category,
      distance: recommendation.distance
    }
  });
};

export const trackRecommendationClick = (venueId: string, userId: string, recommendation: any) => {
  venueAnalytics.trackEvent({
    type: 'click',
    venueId,
    userId,
    recommendationId: `${userId}-${venueId}-${Date.now()}`,
    confidence: recommendation.confidence || 0,
    vibeMatchScore: recommendation.vibeMatch?.score || 0,
    socialProofScore: recommendation.socialProof?.friendVisits ? 
      Math.min(1, recommendation.socialProof.friendVisits / 10) : 0
  });
};

export const trackRecommendationFavorite = (venueId: string, userId: string, recommendation: any) => {
  venueAnalytics.trackEvent({
    type: 'favorite',
    venueId,
    userId,
    recommendationId: `${userId}-${venueId}-${Date.now()}`,
    confidence: recommendation.confidence || 0,
    vibeMatchScore: recommendation.vibeMatch?.score || 0,
    socialProofScore: recommendation.socialProof?.friendVisits ? 
      Math.min(1, recommendation.socialProof.friendVisits / 10) : 0
  });
};

// Periodic cleanup
setInterval(() => {
  venueAnalytics.cleanup();
}, 60 * 60 * 1000); // Clean up every hour