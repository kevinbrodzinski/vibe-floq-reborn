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

export interface EnhancedSocialContextData {
  socialScore: number;
  nearbyFriends: any[];
  socialRecommendations: string[];
  groupDynamics: any;
  hotspots: Array<{
    id: string;
    name: string;
    socialMetrics: {
      userCount: number;
    };
    prediction: {
      confidence: number;
    };
  }>;
}

export interface EnhancedPersonalHeroData {
  heroMetrics: any;
  personalInsights: any;
  adaptiveContent: any;
  confidence: number;
  accuracy: number;
  currentVibe: string;
  predictions: {
    nextVibeTransition: any;
    contextualSuggestions: any;
  };
  learningProgress: {
    totalCorrections: number;
    streakDays: number;
  };
  sensorQuality: {
    overall: number;
    audio: number;
    motion: number;
    light: number;
    location: number;
  };
  environmentalFactors: {
    isOptimalTime: boolean;
    socialDensity: number;
    temporalMomentum: number;
    vibeCoherence: number;
  };
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
    locationData: any,
    proximityData: any
  ): Promise<EnhancedSocialContextData> {
    return {
      socialScore: Math.random() * 0.4 + 0.6,
      nearbyFriends: proximityData?.nearbyFriends || [],
      socialRecommendations: ['Connect with nearby friends', 'Join local events'],
      groupDynamics: { cohesion: 0.8, energy: 0.7 },
      hotspots: [
        {
          id: 'hotspot-1',
          name: 'Coffee District',
          socialMetrics: { userCount: 12 },
          prediction: { confidence: 0.85 }
        },
        {
          id: 'hotspot-2', 
          name: 'Park Central',
          socialMetrics: { userCount: 8 },
          prediction: { confidence: 0.72 }
        }
      ]
    };
  }

  async getEnhancedPersonalHeroData(
    heroData: any,
    sensorData: any,
    locationData: any
  ): Promise<EnhancedPersonalHeroData> {
    return {
      heroMetrics: { energy: 0.8, focus: 0.6, social: 0.7 },
      personalInsights: { mood: 'positive', trend: 'improving' },
      adaptiveContent: { suggestions: ['Take a break', 'Connect with friends'] },
      confidence: 0.82,
      accuracy: 0.76,
      currentVibe: 'social',
      predictions: {
        nextVibeTransition: { vibe: 'chill', probability: 0.65, timeframe: '30min' },
        contextualSuggestions: ['Try a quieter venue', 'Join a group activity']
      },
      learningProgress: {
        totalCorrections: 47,
        streakDays: 12
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
      }
    };
  }
}