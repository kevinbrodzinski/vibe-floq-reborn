/**
 * VibeSystemIntegration - Exports required types and core functionality
 * for the vibe analysis system
 */

export interface SystemHealthMetrics {
  overallHealth: number;
  accuracy: number;
  responseTime: number;
  learningProgress: number;
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
    analysis: any
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
}