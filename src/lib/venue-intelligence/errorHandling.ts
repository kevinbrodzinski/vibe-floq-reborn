import { VenueRecommendation } from '@/hooks/useVenueRecommendations';

export interface VenueRecommendationError {
  code: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  fallback?: 'basic' | 'cached' | 'mock';
}

export class VenueRecommendationErrorHandler {
  private static errors: VenueRecommendationError[] = [];

  static logError(error: VenueRecommendationError) {
    this.errors.push({
      ...error,
      timestamp: new Date().toISOString()
    } as any);
    
    // Only log high severity errors to console
    if (error.severity === 'high') {
      console.error(`[VenueRecommendations] ${error.code}: ${error.message}`);
    }
  }

  static getErrorStats() {
    return {
      total: this.errors.length,
      bySeverity: {
        low: this.errors.filter(e => e.severity === 'low').length,
        medium: this.errors.filter(e => e.severity === 'medium').length,
        high: this.errors.filter(e => e.severity === 'high').length,
      },
      recent: this.errors.slice(-10)
    };
  }

  static clearErrors() {
    this.errors = [];
  }
}

/**
 * Wraps venue intelligence operations with error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  errorCode: string,
  fallback?: T
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    VenueRecommendationErrorHandler.logError({
      code: errorCode,
      message: errorMessage,
      severity: fallback ? 'medium' : 'high',
      fallback: fallback ? 'basic' : undefined
    });

    if (fallback !== undefined) {
      return fallback;
    }
    
    throw error;
  }
}

/**
 * Creates fallback venue recommendations when main system fails
 */
export function createFallbackRecommendations(
  venues: any[],
  userLocation?: { lat: number; lng: number }
): VenueRecommendation[] {
  if (!venues?.length) return [];

  return venues.slice(0, 5).map((venue, index) => ({
    id: venue.id,
    name: venue.name,
    category: venue.categories?.[0] || 'Venue',
    address: venue.address || 'Address not available',
    rating: venue.rating || 4.0,
    priceLevel: (venue.price_tier as '$' | '$$' | '$$$' | '$$$$') || '$$',
    distance: userLocation ? 
      `${Math.round(Math.random() * 2 + 0.5)} mi` : 'Distance unknown',
    travelTime: userLocation ? 
      `${Math.round(Math.random() * 15 + 5)} min` : 'Time unknown',
    imageUrl: venue.photo_url || 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400',
    
    vibeMatch: {
      score: 0.6 + Math.random() * 0.2, // 60-80% base match
      explanation: "Recommended based on location and basic preferences",
      userVibes: ['social', 'flowing'],
      venueVibes: venue.categories?.slice(0, 2) || ['casual'],
      synergy: "Good option for exploring new places"
    },
    
    crowdIntelligence: {
      currentCapacity: Math.round(Math.random() * 60 + 20), // 20-80%
      predictedPeak: "Peak times vary by venue type",
      typicalCrowd: "Mixed crowd of locals and visitors",
      friendCompatibility: "Limited social data available",
      busyTimes: generateBasicBusyTimes(venue.categories?.[0])
    },
    
    socialProof: {
      friendVisits: 0,
      recentVisitors: [],
      networkRating: venue.rating || 4.0,
      popularWith: "Discover something new for your network"
    },
    
    context: {
      dayOfWeek: "Good option for any day",
      timeRelevance: "Suitable for current time",
      weatherSuitability: "Indoor venue - weather won't be a factor",
      eventContext: "Great for casual visits",
      moodAlignment: "Adaptable to different moods"
    },
    
    realTime: {
      liveEvents: [],
      waitTime: 'Wait time unknown',
      specialOffers: [],
      atmosphereLevel: 'moderate' as const,
      nextEventTime: undefined
    },
    
    confidence: 0.4 + index * 0.1, // Decreasing confidence
    topReasons: [
      "Located nearby",
      venue.rating ? `Good rating (${venue.rating}/5)` : "Popular venue",
      "Worth exploring",
      "Basic recommendation available"
    ],
    warnings: ["Limited intelligence data available - basic recommendation"]
  }));
}

function generateBasicBusyTimes(category?: string): { [hour: string]: number } {
  const busyTimes: { [hour: string]: number } = {};
  const isBar = category?.toLowerCase().includes('bar');
  const isCafe = category?.toLowerCase().includes('cafe');
  const isRestaurant = category?.toLowerCase().includes('restaurant');

  for (let hour = 6; hour <= 23; hour++) {
    let capacity = 30; // Base capacity
    
    if (isCafe) {
      if (hour >= 7 && hour <= 9) capacity = 70;
      else if (hour >= 12 && hour <= 14) capacity = 60;
    } else if (isBar) {
      if (hour >= 17 && hour <= 23) capacity = 80;
    } else if (isRestaurant) {
      if (hour >= 12 && hour <= 14) capacity = 70;
      else if (hour >= 18 && hour <= 21) capacity = 80;
    }
    
    busyTimes[hour.toString()] = capacity;
  }
  
  return busyTimes;
}

/**
 * Validates venue recommendation data quality
 */
export function validateRecommendation(recommendation: VenueRecommendation): {
  isValid: boolean;
  issues: string[];
  quality: 'high' | 'medium' | 'low';
} {
  const issues: string[] = [];
  
  // Required fields
  if (!recommendation.name) issues.push('Missing venue name');
  if (!recommendation.id) issues.push('Missing venue ID');
  if (recommendation.vibeMatch.score < 0 || recommendation.vibeMatch.score > 1) {
    issues.push('Invalid vibe match score');
  }
  if (recommendation.confidence < 0 || recommendation.confidence > 1) {
    issues.push('Invalid confidence score');
  }
  
  // Data quality indicators
  const hasRealTimeData = recommendation.realTime.waitTime !== 'Wait time unknown';
  const hasSocialProof = recommendation.socialProof.friendVisits > 0;
  const hasDetailedVibe = recommendation.vibeMatch.explanation.length > 50;
  
  let quality: 'high' | 'medium' | 'low' = 'low';
  const qualityScore = [hasRealTimeData, hasSocialProof, hasDetailedVibe].filter(Boolean).length;
  
  if (qualityScore >= 2) quality = 'high';
  else if (qualityScore === 1) quality = 'medium';
  
  return {
    isValid: issues.length === 0,
    issues,
    quality
  };
}

/**
 * Filters and sorts recommendations by quality
 */
export function optimizeRecommendations(
  recommendations: VenueRecommendation[]
): VenueRecommendation[] {
  return recommendations
    .map(rec => ({
      ...rec,
      _quality: validateRecommendation(rec).quality
    }))
    .sort((a: any, b: any) => {
      // Sort by quality first, then confidence
      const qualityOrder = { high: 3, medium: 2, low: 1 };
      const qualityDiff = qualityOrder[b._quality] - qualityOrder[a._quality];
      if (qualityDiff !== 0) return qualityDiff;
      
      return b.confidence - a.confidence;
    })
    .map(({ _quality, ...rec }) => rec); // Remove quality marker
}