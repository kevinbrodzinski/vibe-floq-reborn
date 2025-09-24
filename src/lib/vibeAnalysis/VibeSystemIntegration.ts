/**
 * VibeSystemIntegration - Exports required types and core functionality
 * for the vibe analysis system
 */

export interface SystemHealthMetrics {
  overallHealth: number;
  accuracy: number;
  responseTime: number;
  learningProgress: number;
  recommendations?: string[];
  detailedMetrics?: {
    sensorQuality?: Record<string, number>;
    mlConfidence?: number;
    featureQuality?: number;
    gpsAccuracy?: number;
    venueAccuracy?: number;
    activeProximityEvents?: number;
    proximityConfidence?: number;
    avgResponseTime?: number;
    cacheHitRate?: number;
    memoryUsage?: number;
    dbConnected?: boolean;
    avgQueryTime?: number;
    recordsProcessed?: number;
  };
}

export interface EnhancedFeedbackData {
  feedbackType: 'contextual' | 'simple' | 'detailed';
  showUncertainty: boolean;
  emphasizePersonalization: boolean;
  suggestExploration: boolean;
  userConsistency?: number;
  learningInsights?: {
    accuracyTrend: number;
    adaptationRate: number;
  };
  adaptiveInterface: {
    feedbackType: 'contextual' | 'simple' | 'detailed';
    showUncertainty: boolean;
    emphasizePersonalization: boolean;
    suggestExploration: boolean;
    userConsistency?: number;
  };
}

export interface Hotspot {
  id: string;
  name: string;
  center: { lat: number; lng: number };
  intensity: number;
  momentumScore: number;
  predictionConfidence: number;
  dominantVibe: string;
  momentum: number;
  stability: number;
  diversity: number;
  socialMetrics: {
    userCount: number;
    vibeCoherence: number;
    averageStayTime: number;
  };
  prediction: {
    confidence: number;
    trend: 'rising' | 'stable' | 'falling';
    peakTime: string;
  };
}

export interface ProximityIntelligence {
  confidenceScores: Record<string, number>;
  proximityTrends: {
    friendId: string;
    trend: 'approaching' | 'departing' | 'stable';
    confidence: number;
    estimatedMeetupTime?: string;
  }[];
  optimalMeetupLocations: { venueId: string; score: number }[];
  socialMomentum: { score: number; direction: 'building' | 'falling' };
}

export interface EnhancedSocialContextData {
  hotspots: Hotspot[];
  alignment: number;
  proximityIntelligence: ProximityIntelligence;
  socialScore: number;
  nearbyFriends: any[];
  socialRecommendations: string[];
  groupDynamics: any;
}

export interface EnvFactors { 
  isOptimalTime: boolean;
  socialDensity: number;
  temporalMomentum: number;
  vibeCoherence: number;
}

export interface VibePrediction { 
  vibe: string; 
  score: number;
  probability: number;
  timeframe: string;
  reason: string;
  confidence: number;
}

export interface EnhancedPersonalHeroData {
  confidence: number;
  accuracy: number;
  currentVibe: string;
  predictions: {
    nextVibeTransition: {
      vibe: string;
      probability: number;
      timeframe: string;
    };
    contextualSuggestions: Array<{
      vibe: string;
      reason: string;
      confidence: number;
    }>;
  };
  sensorQuality: {
    overall: number;
    audio: number;
    motion: number;
    light: number;
    location: number;
  };
  environmentalFactors: EnvFactors;
  learningProgress: {
    totalCorrections: number;
    streakDays: number;
  };
  heroMetrics: any;
  personalInsights: any;
  adaptiveContent: any;
}

export class VibeSystemIntegration {
  async getSystemHealthMetrics(): Promise<SystemHealthMetrics> {
    // Mock implementation for now
    return {
      overallHealth: 0.85,
      accuracy: 0.78,
      responseTime: 45,
      learningProgress: 0.65,
      detailedMetrics: {
        sensorQuality: {
          audio: 0.8,
          light: 0.9,
          movement: 0.7,
          location: 0.85
        },
        mlConfidence: 0.75,
        featureQuality: 0.82,
        avgResponseTime: 45,
        cacheHitRate: 0.92,
        memoryUsage: 0.45,
        dbConnected: true,
        avgQueryTime: 15,
        recordsProcessed: 1250
      }
    };
  }

  async getEnhancedFeedbackData(
    sensorData: any,
    context: any,
    analysis?: any
  ): Promise<EnhancedFeedbackData> {
    // Mock implementation with adaptive interface
    const userConsistency = Math.random() * 0.4 + 0.6; // 0.6-1.0 range
    
    let feedbackType: 'simple' | 'detailed' | 'contextual';
    if (userConsistency > 0.8) {
      feedbackType = 'simple';
    } else if (context.location) {
      feedbackType = 'contextual';
    } else {
      feedbackType = 'detailed';
    }

    return {
      feedbackType,
      showUncertainty: analysis.confidence < 0.7,
      emphasizePersonalization: userConsistency < 0.7,
      suggestExploration: Math.random() > 0.5,
      userConsistency,
      learningInsights: {
        accuracyTrend: Math.random() * 0.3 + 0.7, // 0.7-1.0 range
        adaptationRate: Math.random() * 0.5 + 0.5  // 0.5-1.0 range
      },
      adaptiveInterface: {
        feedbackType,
        showUncertainty: analysis.confidence < 0.7,
        emphasizePersonalization: userConsistency < 0.7,
        suggestExploration: Math.random() > 0.5,
        userConsistency
      }
    };
  }

  async getEnhancedSocialContextData(
    locationData?: any,
    vibe?: any,
    friends?: any
  ): Promise<EnhancedSocialContextData> {
    return {
      hotspots: [
        {
          id: 'hotspot-1',
          name: 'Coffee District',
          center: { lat: 37.7749, lng: -122.4194 },
          intensity: 0.8,
          momentumScore: 0.6,
          predictionConfidence: 0.85,
          dominantVibe: 'social',
          momentum: 0.6,
          stability: 0.7,
          diversity: 0.5,
          socialMetrics: { 
            userCount: 12,
            vibeCoherence: 0.85,
            averageStayTime: 45
          },
          prediction: { 
            confidence: 0.85,
            trend: 'rising' as const,
            peakTime: '2:30 PM'
          }
        },
        {
          id: 'hotspot-2', 
          name: 'Park Central',
          center: { lat: 37.7849, lng: -122.4094 },
          intensity: 0.6,
          momentumScore: 0.4,
          predictionConfidence: 0.72,
          dominantVibe: 'chill',
          momentum: 0.4,
          stability: 0.9,
          diversity: 0.7,
          socialMetrics: { 
            userCount: 8,
            vibeCoherence: 0.72,
            averageStayTime: 60
          },
          prediction: { 
            confidence: 0.72,
            trend: 'stable' as const,
            peakTime: '4:00 PM'
          }
        }
      ],
      alignment: 0.75,
      proximityIntelligence: {
        confidenceScores: {},
        proximityTrends: [],
        optimalMeetupLocations: [],
        socialMomentum: { score: 0.6, direction: 'building' },
      },
      socialScore: Math.random() * 0.4 + 0.6,
      nearbyFriends: friends || [],
      socialRecommendations: ['Connect with nearby friends', 'Join local events'],
      groupDynamics: { cohesion: 0.8, energy: 0.7 },
    };
  }

  async getEnhancedPersonalHeroData(
    sensorData?: any,
    location?: any
  ): Promise<EnhancedPersonalHeroData> {
    return {
      confidence: 0.82,
      accuracy: 0.76,
      currentVibe: 'social',
      predictions: {
        nextVibeTransition: { 
          vibe: 'chill', 
          probability: 0.65, 
          timeframe: '30min'
        },
        contextualSuggestions: [
          { vibe: 'chill', reason: 'Try a quieter venue', confidence: 0.7 },
          { vibe: 'social', reason: 'Join a group activity', confidence: 0.8 }
        ]
      },
      sensorQuality: {
        overall: 0.78,
        audio: 0.85,
        motion: 0.72,
        light: 0.81,
        location: 0.79
      },
      environmentalFactors: {
        isOptimalTime: true,
        socialDensity: 0.67,
        temporalMomentum: 0.73,
        vibeCoherence: 0.89
      },
      learningProgress: {
        totalCorrections: 47,
        streakDays: 12
      },
      heroMetrics: { energy: 0.8, focus: 0.6, social: 0.7 },
      personalInsights: { mood: 'positive', trend: 'improving' },
      adaptiveContent: { suggestions: ['Take a break', 'Connect with friends'] },
    };
  }
}