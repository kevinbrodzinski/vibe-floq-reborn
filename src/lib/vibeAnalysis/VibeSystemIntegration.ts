import type { Vibe } from '@/types/vibes';
import { VibeAnalysisEngine, type VibeAnalysisResult } from './VibeAnalysisEngine';
import { AccuracyMeasurementSystem, type AccuracyMetrics } from './AccuracyMeasurement';
import { UserLearningSystem } from './UserLearningSystem';

/**
 * Enhanced UI Integration Layer
 * 
 * Connects the optimized vibe detection system with existing UI components
 * and provides enhanced user experience features.
 */

// Enhanced PersonalHero Data
export interface EnhancedPersonalHeroData {
  // Current status
  currentVibe: Vibe;
  confidence: number;
  accuracy: number;
  
  // Real-time metrics
  sensorQuality: {
    overall: number;
    audio: number;
    motion: number;
    light: number;
    location: number;
  };
  
  // Learning insights
  learningProgress: {
    totalCorrections: number;
    accuracy: number;
    personalityProfile: {
      energyPreference: number;
      socialPreference: number;
      consistencyScore: number;
    };
    streakDays: number;
  };
  
  // Predictive insights
  predictions: {
    nextVibeTransition?: {
      vibe: Vibe;
      probability: number;
      timeEstimate: string;
    };
    contextualSuggestions: Array<{
      vibe: Vibe;
      reason: string;
      confidence: number;
    }>;
  };
  
  // Environmental context
  environmentalFactors: {
    temporalMomentum: number;
    socialDensity: number;
    vibeCoherence: number;
    isOptimalTime: boolean;
  };
}

// Enhanced Social Context Data
export interface EnhancedSocialContextData {
  // Current social alignment
  alignment: {
    friendMatches: Array<{
      friendId: string;
      name: string;
      vibe: Vibe;
      matchScore: number;
      distance: string;
      isActive: boolean;
    }>;
    overallAlignment: number;
    peakWindow: {
      remaining: number; // minutes
      progress: number; // 0-1
      isInPeak: boolean;
    };
  };
  
  // Proximity intelligence data
  proximityIntelligence?: {
    socialMomentum?: {
      score: number;
      trend: 'rising' | 'falling' | 'stable';
    };
    confidenceScores: Record<string, number>;
    proximityTrends: Array<{
      friendId: string;
      trend: 'approaching' | 'stable' | 'departing';
      confidence: number;
      estimatedMeetupTime?: string;
    }>;
    optimalMeetupLocations: Array<{
      location: { lat: number; lng: number };
      score: number;
      reasoning: string;
    }>;
  };
  
  // Enhanced hotspot data
  hotspots: Array<{
    id: string;
    location: { lat: number; lng: number };
    dominantVibe: Vibe;
    intensity: number;
    momentum: number;
    stability: number;
    diversity: number;
    prediction: {
      trend: 'rising' | 'falling' | 'stable';
      confidence: number;
      peakTime?: string;
    };
    socialMetrics: {
      userCount: number;
      averageStayTime: number;
      vibeCoherence: number;
    };
  }>;
  
  // Venue recommendations with ML scoring
  venues: Array<{
    id: string;
    name: string;
    location: { lat: number; lng: number };
    vibeMatch: {
      score: number;
      reasoning: string[];
      confidence: number;
    };
    crowdIntelligence: {
      currentVibe: Vibe;
      typicalCrowd: string;
      busyTimes: string[];
      vibeHistory: Array<{ time: string; vibe: Vibe; intensity: number }>;
    };
    predictions: {
      vibeEvolution: Array<{ time: string; vibe: Vibe; probability: number }>;
      crowdSize: { current: number; predicted: number; };
      waitTime: number;
    };
  }>;
}

// Enhanced Feedback System
export interface EnhancedFeedbackData {
  suggestion: {
    vibe: Vibe;
    confidence: number;
    reasoning: string[];
    alternatives: Array<{ vibe: Vibe; confidence: number; reason: string }>;
  };
  
  learningContext: {
    similarPastSituations: number;
    userConsistency: number;
    personalityAlignment: number;
    contextualRelevance: number;
  };
  
  adaptiveInterface: {
    feedbackType: 'simple' | 'detailed' | 'contextual';
    showUncertainty: boolean;
    emphasizePersonalization: boolean;
    suggestExploration: boolean;
  };
}

export class VibeSystemIntegration {
  private analysisEngine: VibeAnalysisEngine;
  private accuracySystem: AccuracyMeasurementSystem;
  private learningSystem: UserLearningSystem;
  
  // Real-time state management
  private currentAnalysis: VibeAnalysisResult | null = null;
  private lastUpdateTime: Date = new Date();
  private predictionCache: Map<string, any> = new Map();
  
  constructor() {
    this.analysisEngine = new VibeAnalysisEngine();
    this.accuracySystem = new AccuracyMeasurementSystem();
    this.learningSystem = new UserLearningSystem();
  }
  
  /**
   * Enhanced PersonalHero Integration
   * Provides rich contextual data for the personal dashboard
   */
  async getEnhancedPersonalHeroData(
    sensorData: any,
    context: any
  ): Promise<EnhancedPersonalHeroData> {
    // Get current vibe analysis
    const analysis = await this.analysisEngine.analyzeVibe(sensorData, context);
    this.currentAnalysis = analysis;
    
    // Get learning insights
    const personalFactors = await this.learningSystem.getPersonalFactors(sensorData, context);
    
    // Calculate streak (would integrate with actual user data)
    const streakDays = this.calculateVibeStreak();
    
    // Generate predictions
    const predictions = await this.generateVibePredictions(analysis, personalFactors);
    
    // Assess environmental factors
    const environmentalFactors = this.assessEnvironmentalContext(analysis);
    
    return {
      currentVibe: analysis.suggestedVibe,
      confidence: analysis.confidence,
      accuracy: personalFactors.accuracy,
      
      sensorQuality: analysis.sensorQuality,
      
      learningProgress: {
        totalCorrections: personalFactors.contextualPatterns.length,
        accuracy: personalFactors.accuracy,
        personalityProfile: {
          energyPreference: personalFactors.personalityProfile.energyPreference,
          socialPreference: personalFactors.personalityProfile.socialPreference,
          consistencyScore: personalFactors.personalityProfile.consistencyScore,
        },
        streakDays
      },
      
      predictions,
      environmentalFactors
    };
  }
  
  /**
   * Enhanced Social Context Integration
   * Provides advanced social matching and hotspot analysis
   */
  async getEnhancedSocialContextData(
    userLocation: { lat: number; lng: number },
    currentVibe: Vibe,
    friends: any[]
  ): Promise<EnhancedSocialContextData> {
    // Get enhanced hotspot data
    const hotspots = await this.getEnhancedHotspots(userLocation, currentVibe);
    
    // Calculate friend alignment with ML scoring
    const alignment = await this.calculateEnhancedAlignment(friends, currentVibe);
    
    // Get ML-enhanced venue recommendations
    const venues = await this.getEnhancedVenueRecommendations(userLocation, currentVibe);
    
    return {
      alignment,
      hotspots,
      venues
    };
  }
  
  /**
   * Enhanced Feedback System Integration
   * Provides adaptive feedback based on user learning and context
   */
  async getEnhancedFeedbackData(
    analysis: VibeAnalysisResult,
    userHistory: any[]
  ): Promise<EnhancedFeedbackData> {
    const personalFactors = await this.learningSystem.getPersonalFactors(
      analysis.mlAnalysis.featureVector as any,
      {} as any
    );
    
    // Determine adaptive interface settings
    const adaptiveInterface = this.determineAdaptiveInterface(personalFactors, analysis);
    
    // Find similar past situations
    const similarSituations = this.findSimilarSituations(userHistory, analysis);
    
    return {
      suggestion: {
        vibe: analysis.suggestedVibe,
        confidence: analysis.confidence,
        reasoning: analysis.reasoning,
        alternatives: analysis.alternatives.slice(0, 3).map(alt => ({
          vibe: alt.vibe,
          confidence: alt.confidence,
          reason: this.generateAlternativeReason(alt.vibe, analysis)
        }))
      },
      
      learningContext: {
        similarPastSituations: similarSituations.length,
        userConsistency: personalFactors.personalityProfile.consistencyScore,
        personalityAlignment: this.calculatePersonalityAlignment(analysis, personalFactors),
        contextualRelevance: personalFactors.relevance
      },
      
      adaptiveInterface
    };
  }
  
  /**
   * Real-time Accuracy Monitoring Integration
   * Provides system health metrics for UI display
   */
  getSystemHealthMetrics(): {
    overallHealth: number; // 0-100
    accuracy: number;
    responseTime: number;
    learningProgress: number;
    recommendations: string[];
  } {
    const metrics = this.accuracySystem.calculateAccuracyMetrics();
    const validation = this.accuracySystem.validateSystem(metrics);
    
    return {
      overallHealth: validation.overallScore,
      accuracy: metrics.overallAccuracy,
      responseTime: metrics.responseTime.mean,
      learningProgress: this.calculateLearningProgress(),
      recommendations: validation.issues
        .filter(i => i.severity !== 'low')
        .map(i => i.recommendation)
        .slice(0, 3)
    };
  }
  
  /**
   * Contextual Suggestion Engine
   * Provides smart suggestions based on current context and user patterns
   */
  async getContextualSuggestions(
    currentVibe: Vibe,
    location: { lat: number; lng: number },
    timeContext: any
  ): Promise<Array<{
    type: 'vibe_change' | 'location_change' | 'activity_suggestion' | 'social_connection';
    title: string;
    description: string;
    confidence: number;
    action: string;
    reasoning: string[];
  }>> {
    const suggestions = [];
    
    // Vibe transition suggestions
    const vibeTransitions = await this.predictVibeTransitions(currentVibe, timeContext);
    vibeTransitions.forEach(transition => {
      suggestions.push({
        type: 'vibe_change' as const,
        title: `Consider transitioning to ${transition.vibe}`,
        description: `Based on your patterns, you often shift to ${transition.vibe} around this time`,
        confidence: transition.probability,
        action: `Switch to ${transition.vibe}`,
        reasoning: [`Historical pattern match: ${(transition.probability * 100).toFixed(0)}%`]
      });
    });
    
    // Location-based suggestions
    const locationSuggestions = await this.generateLocationSuggestions(location, currentVibe);
    suggestions.push(...locationSuggestions);
    
    // Social connection suggestions
    const socialSuggestions = await this.generateSocialSuggestions(currentVibe);
    suggestions.push(...socialSuggestions);
    
    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);
  }
  
  /**
   * Record user interaction for continuous learning
   */
  async recordUserInteraction(
    interactionType: 'vibe_selection' | 'feedback' | 'correction' | 'venue_visit' | 'social_action',
    data: any
  ): Promise<void> {
    const predictionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Record for accuracy measurement
    if (this.currentAnalysis) {
      this.accuracySystem.recordPrediction(
        predictionId,
        data.sensorData,
        data.context,
        this.currentAnalysis,
        {
          profileId: data.profileId,
          sessionId: data.sessionId,
          interactionType
        }
      );
      
      // Record ground truth if available
      if (data.groundTruth) {
        this.accuracySystem.recordGroundTruth(predictionId, {
          vibe: data.groundTruth.vibe,
          confidence: data.groundTruth.confidence || 1.0,
          source: 'user_correction',
          delay: Date.now() - this.lastUpdateTime.getTime()
        });
      }
    }
    
    // Record for learning system
    if (interactionType === 'correction' && data.originalVibe && data.correctedVibe) {
      await this.learningSystem.recordCorrection(
        data.originalVibe,
        data.correctedVibe,
        data.context
      );
    }
  }
  
  // Private helper methods
  
  private calculateVibeStreak(): number {
    // Would integrate with actual user data
    return Math.floor(Math.random() * 10) + 1;
  }
  
  private async generateVibePredictions(
    analysis: VibeAnalysisResult,
    personalFactors: any
  ): Promise<EnhancedPersonalHeroData['predictions']> {
    const predictions = {
      contextualSuggestions: [] as Array<{
        vibe: Vibe;
        reason: string;
        confidence: number;
      }>
    };
    
    // Generate contextual suggestions based on ML analysis
    analysis.alternatives.slice(0, 3).forEach(alt => {
      predictions.contextualSuggestions.push({
        vibe: alt.vibe,
        reason: this.generateSuggestionReason(alt.vibe, analysis),
        confidence: alt.confidence
      });
    });
    
    // Predict next vibe transition if patterns exist
    if (personalFactors.temporalPatterns.hourlyPreferences) {
      const nextTransition = this.predictNextVibeTransition(personalFactors);
      if (nextTransition) {
        predictions.nextVibeTransition = nextTransition;
      }
    }
    
    return predictions;
  }
  
  private assessEnvironmentalContext(analysis: VibeAnalysisResult): EnhancedPersonalHeroData['environmentalFactors'] {
    return {
      temporalMomentum: analysis.mlAnalysis.featureVector.temporalMomentum,
      socialDensity: analysis.mlAnalysis.featureVector.sensorCoherence * 100,
      vibeCoherence: analysis.mlAnalysis.featureVector.sensorCoherence,
      isOptimalTime: analysis.confidence > 0.8 && analysis.mlAnalysis.uncertaintyEstimate < 0.2
    };
  }
  
  private async getEnhancedHotspots(
    location: { lat: number; lng: number },
    currentVibe: Vibe
  ): Promise<EnhancedSocialContextData['hotspots']> {
    // Would integrate with enhanced hotspot detection system
    return [
      {
        id: 'hotspot-1',
        location: { lat: location.lat + 0.001, lng: location.lng + 0.001 },
        dominantVibe: 'social' as Vibe,
        intensity: 0.8,
        momentum: 0.6,
        stability: 0.7,
        diversity: 0.5,
        prediction: {
          trend: 'rising' as const,
          confidence: 0.75,
          peakTime: '8:30 PM'
        },
        socialMetrics: {
          userCount: 24,
          averageStayTime: 45,
          vibeCoherence: 0.8
        }
      }
    ];
  }
  
  private async calculateEnhancedAlignment(
    friends: any[],
    currentVibe: Vibe
  ): Promise<EnhancedSocialContextData['alignment']> {
    const friendMatches = friends.map(friend => ({
      friendId: friend.id,
      name: friend.name,
      vibe: friend.currentVibe || 'chill' as Vibe,
      matchScore: this.calculateVibeCompatibility(currentVibe, friend.currentVibe || 'chill'),
      distance: friend.distance || '0.5 km',
      isActive: friend.isActive || false
    }));
    
    const overallAlignment = friendMatches.reduce((sum, match) => sum + match.matchScore, 0) / friendMatches.length;
    
    return {
      friendMatches,
      overallAlignment,
      peakWindow: {
        remaining: 16,
        progress: 0.65,
        isInPeak: true
      }
    };
  }
  
  private async getEnhancedVenueRecommendations(
    location: { lat: number; lng: number },
    currentVibe: Vibe
  ): Promise<EnhancedSocialContextData['venues']> {
    // Would integrate with venue recommendation system
    return [];
  }
  
  private determineAdaptiveInterface(personalFactors: any, analysis: VibeAnalysisResult): EnhancedFeedbackData['adaptiveInterface'] {
    const consistency = personalFactors.personalityProfile.consistencyScore;
    const confidence = analysis.confidence;
    const uncertainty = analysis.mlAnalysis.uncertaintyEstimate;
    
    return {
      feedbackType: consistency > 0.7 ? 'simple' : confidence < 0.6 ? 'detailed' : 'contextual',
      showUncertainty: uncertainty > 0.3,
      emphasizePersonalization: personalFactors.relevance > 0.5,
      suggestExploration: personalFactors.personalityProfile.adaptabilityScore > 0.6
    };
  }
  
  private findSimilarSituations(userHistory: any[], analysis: VibeAnalysisResult): any[] {
    // Would implement similarity search based on context and sensor data
    return [];
  }
  
  private generateAlternativeReason(vibe: Vibe, analysis: VibeAnalysisResult): string {
    const reasons = {
      chill: 'Your energy levels suggest a more relaxed vibe might fit better',
      social: 'The social context indicates you might enjoy connecting with others',
      hype: 'Your movement patterns suggest high energy alignment',
      solo: 'Your focus metrics indicate you might prefer some alone time',
      // ... other vibes
    };
    
    return reasons[vibe] || 'Alternative suggestion based on current context';
  }
  
  private calculatePersonalityAlignment(analysis: VibeAnalysisResult, personalFactors: any): number {
    const energyAlignment = Math.abs(
      (analysis.mlAnalysis.featureVector.energy - 0.5) - 
      personalFactors.personalityProfile.energyPreference
    );
    
    const socialAlignment = Math.abs(
      (analysis.mlAnalysis.featureVector.social - 0.5) - 
      personalFactors.personalityProfile.socialPreference
    );
    
    return 1 - (energyAlignment + socialAlignment) / 2;
  }
  
  private calculateLearningProgress(): number {
    // Would calculate based on accuracy improvement over time
    return 0.75; // 75% learning progress
  }
  
  private async predictVibeTransitions(currentVibe: Vibe, timeContext: any): Promise<Array<{
    vibe: Vibe;
    probability: number;
    timeEstimate: string;
  }>> {
    // Would implement temporal pattern analysis
    return [];
  }
  
  private async generateLocationSuggestions(location: { lat: number; lng: number }, currentVibe: Vibe): Promise<any[]> {
    // Would implement location-based suggestions
    return [];
  }
  
  private async generateSocialSuggestions(currentVibe: Vibe): Promise<any[]> {
    // Would implement social connection suggestions
    return [];
  }
  
  private predictNextVibeTransition(personalFactors: any): any {
    // Would implement next transition prediction
    return null;
  }
  
  private generateSuggestionReason(vibe: Vibe, analysis: VibeAnalysisResult): string {
    return `Based on your current ${analysis.contextFactors.environmental > 0.7 ? 'environment' : 'patterns'}`;
  }
  
  private calculateVibeCompatibility(vibe1: Vibe, vibe2: Vibe): number {
    // Simplified compatibility matrix
    const compatibility: Record<Vibe, Record<Vibe, number>> = {
      social: { social: 1.0, hype: 0.8, open: 0.9, flowing: 0.7 },
      chill: { chill: 1.0, solo: 0.8, down: 0.6, romantic: 0.7 },
      // ... other combinations
    } as any;
    
    return compatibility[vibe1]?.[vibe2] || 0.5;
  }
}