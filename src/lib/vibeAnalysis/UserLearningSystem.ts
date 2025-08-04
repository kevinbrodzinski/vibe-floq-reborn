import type { Vibe } from '@/types/vibes';
import type { AnalysisContext, SensorData } from './VibeAnalysisEngine';

export interface UserCorrection {
  originalSuggestion: Vibe;
  userChoice: Vibe;
  context: AnalysisContext;
  timestamp: Date;
  sensorData: SensorData;
  // Enhanced correction metadata
  correctionStrength: number; // How different the choice was from suggestion
  contextSimilarity: number; // How similar this context is to previous ones
  confidence: number; // User's confidence in their choice (inferred)
}

export interface PersonalFactors {
  relevance: number; // 0-1 how much personal data influences
  accuracy: number; // 0-1 how accurate our personal model is
  vibePreferences: Partial<Record<Vibe, number>>; // -0.3 to +0.3 preference adjustments
  description: string;
  contextualPatterns: Array<{
    context: string;
    preferredVibe: Vibe;
    confidence: number;
    frequency: number; // How often this pattern occurs
    recency: number; // How recent this pattern is (0-1)
  }>;
  // Enhanced personal factors
  learningRate: number; // Adaptive learning rate based on consistency
  personalityProfile: {
    energyPreference: number; // -1 to 1 (low to high energy preference)
    socialPreference: number; // -1 to 1 (solo to social preference)
    consistencyScore: number; // How consistent user choices are
    adaptabilityScore: number; // How much user adapts to context
  };
  temporalPatterns: {
    hourlyPreferences: Record<number, Partial<Record<Vibe, number>>>;
    dayOfWeekPreferences: Record<number, Partial<Record<Vibe, number>>>;
    seasonalTrends: Array<{ timeRange: string; vibeShift: Partial<Record<Vibe, number>> }>;
  };
}

/**
 * Enhanced User Learning System
 * 
 * Advanced machine learning for personalized vibe detection with:
 * - Adaptive learning rates
 * - Context similarity analysis
 * - Temporal pattern recognition
 * - Personality profiling
 * - Confidence-weighted updates
 */
export class UserLearningSystem {
  private readonly STORAGE_KEY = 'vibe-user-learning-v2'; // New version for enhanced data
  private readonly MAX_CORRECTIONS = 200; // Increased for better learning
  private readonly MIN_CORRECTIONS_FOR_LEARNING = 3; // Reduced for faster learning
  
  // Enhanced learning parameters
  private readonly SIMILARITY_THRESHOLD = 0.4; // Minimum similarity for pattern matching
  private readonly RECENCY_DECAY = 0.95; // How much to weight recent vs old patterns
  private readonly BASE_LEARNING_RATE = 0.1;
  private readonly MAX_LEARNING_RATE = 0.3;
  
  // Context similarity weights
  private readonly CONTEXT_WEIGHTS = {
    temporal: 0.3,
    sensor: 0.4,
    location: 0.2,
    personal: 0.1
  };

  /**
   * Enhanced personal factors calculation with advanced ML
   */
  async getPersonalFactors(
    sensors: SensorData,
    context: AnalysisContext
  ): Promise<PersonalFactors> {
    const corrections = this.loadCorrections();
    
    if (corrections.length < this.MIN_CORRECTIONS_FOR_LEARNING) {
      return this.getDefaultPersonalFactors();
    }
    
    // Enhanced pattern analysis
    const relevantCorrections = this.findRelevantCorrections(corrections, sensors, context);
    const vibePreferences = this.calculateEnhancedVibePreferences(corrections);
    const contextualPatterns = this.extractAdvancedContextualPatterns(corrections);
    const accuracy = this.calculateDynamicAccuracy(corrections);
    const learningRate = this.calculateAdaptiveLearningRate(corrections);
    const personalityProfile = this.buildPersonalityProfile(corrections);
    const temporalPatterns = this.extractTemporalPatterns(corrections);
    
    return {
      relevance: this.calculateEnhancedRelevance(relevantCorrections, corrections, context),
      accuracy,
      vibePreferences,
      description: this.generateAdvancedDescription(vibePreferences, contextualPatterns, personalityProfile),
      contextualPatterns,
      learningRate,
      personalityProfile,
      temporalPatterns
    };
  }

  /**
   * Enhanced correction recording with metadata
   */
  async recordCorrection(
    originalSuggestion: Vibe,
    userChoice: Vibe,
    context: AnalysisContext
  ): Promise<void> {
    const corrections = this.loadCorrections();
    
    // Calculate correction metadata
    const correctionStrength = this.calculateCorrectionStrength(originalSuggestion, userChoice);
    const contextSimilarity = this.calculateContextSimilarity(context, corrections);
    const confidence = this.inferUserConfidence(originalSuggestion, userChoice, corrections);
    
    const newCorrection: UserCorrection = {
      originalSuggestion,
      userChoice,
      context,
      timestamp: new Date(),
      sensorData: this.extractSensorDataFromContext(context),
      correctionStrength,
      contextSimilarity,
      confidence
    };
    
    // Add new correction with confidence weighting
    corrections.push(newCorrection);
    
    // Maintain size limit with smart pruning
    if (corrections.length > this.MAX_CORRECTIONS) {
      this.smartPruneCorrections(corrections);
    }
    
    this.saveCorrections(corrections);
  }

  /**
   * Get default factors when no learning data exists
   */
  private getDefaultPersonalFactors(): PersonalFactors {
    return {
      relevance: 0,
      accuracy: 0.5,
      vibePreferences: {},
      description: 'Building personal preferences...',
      contextualPatterns: [],
      learningRate: 0.1,
      personalityProfile: {
        energyPreference: 0,
        socialPreference: 0,
        consistencyScore: 0.5,
        adaptabilityScore: 0.5
      },
      temporalPatterns: {
        hourlyPreferences: {},
        dayOfWeekPreferences: {},
        seasonalTrends: []
      }
    };
  }

  /**
   * Find corrections relevant to current context
   */
  private findRelevantCorrections(
    corrections: UserCorrection[],
    sensors: SensorData,
    context: AnalysisContext
  ): UserCorrection[] {
    return corrections.filter(correction => {
      // Time-based relevance
      const timeMatch = this.calculateTimeRelevance(correction.context, context);
      
      // Sensor-based relevance  
      const sensorMatch = this.calculateSensorRelevance(correction.sensorData, sensors);
      
      // Location-based relevance
      const locationMatch = correction.sensorData.location.context === sensors.location.context;
      
      // Combined relevance threshold
      const relevanceScore = timeMatch * 0.4 + sensorMatch * 0.4 + (locationMatch ? 0.2 : 0);
      
      return relevanceScore > 0.3;
    });
  }

  /**
   * Calculate time-based relevance between contexts
   */
  private calculateTimeRelevance(context1: AnalysisContext, context2: AnalysisContext): number {
    let relevance = 0;
    
    // Same time of day
    if (context1.timeOfDay === context2.timeOfDay) {
      relevance += 0.5;
    }
    
    // Similar hour (within 2 hours)
    const hourDiff = Math.abs(context1.hourOfDay - context2.hourOfDay);
    if (hourDiff <= 2) {
      relevance += 0.3;
    }
    
    // Same day type (weekend vs weekday)
    if (context1.isWeekend === context2.isWeekend) {
      relevance += 0.2;
    }
    
    return Math.min(1, relevance);
  }

  /**
   * Calculate sensor-based relevance
   */
  private calculateSensorRelevance(sensors1: SensorData, sensors2: SensorData): number {
    let relevance = 0;
    
    // Audio level similarity
    const audioDiff = Math.abs(sensors1.audioLevel - sensors2.audioLevel);
    relevance += Math.max(0, (100 - audioDiff) / 100) * 0.3;
    
    // Movement pattern match
    if (sensors1.movement.pattern === sensors2.movement.pattern) {
      relevance += 0.3;
    }
    
    // Light level similarity
    const lightDiff = Math.abs(sensors1.lightLevel - sensors2.lightLevel);
    relevance += Math.max(0, (100 - lightDiff) / 100) * 0.2;
    
    // Location context match
    if (sensors1.location.context === sensors2.location.context) {
      relevance += 0.2;
    }
    
    return Math.min(1, relevance);
  }

  /**
   * Calculate correction strength based on vibe similarity
   */
  private calculateCorrectionStrength(original: Vibe, chosen: Vibe): number {
    // Define vibe similarity matrix (simplified)
    const vibeEmbeddings = {
      chill: [0.2, 0.8, 0.1, 0.7],
      social: [0.7, 0.9, 0.3, 0.8],
      hype: [0.9, 0.8, 0.2, 0.9],
      solo: [0.3, 0.1, 0.9, 0.5],
      romantic: [0.4, 0.6, 0.4, 0.9],
      down: [0.1, 0.2, 0.3, 0.2],
      flowing: [0.6, 0.5, 0.5, 0.7],
      open: [0.5, 0.7, 0.6, 0.8],
      curious: [0.4, 0.4, 0.8, 0.6],
      weird: [0.8, 0.3, 0.7, 0.4],
      energetic: [0.9, 0.6, 0.4, 0.8],
      excited: [0.8, 0.7, 0.3, 0.9],
      focused: [0.3, 0.2, 0.9, 0.6]
    };
    
    const originalEmb = vibeEmbeddings[original] || [0, 0, 0, 0];
    const chosenEmb = vibeEmbeddings[chosen] || [0, 0, 0, 0];
    
    // Calculate cosine similarity
    const dotProduct = originalEmb.reduce((sum, val, i) => sum + val * chosenEmb[i], 0);
    const magnitudeA = Math.sqrt(originalEmb.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(chosenEmb.reduce((sum, val) => sum + val * val, 0));
    
    const similarity = dotProduct / (magnitudeA * magnitudeB);
    return 1 - similarity; // Higher strength for more different choices
  }

  /**
   * Enhanced context similarity with weighted features
   */
  private calculateContextSimilarity(
    newContext: AnalysisContext,
    corrections: UserCorrection[]
  ): number {
    if (corrections.length === 0) return 0;
    
    let maxSimilarity = 0;
    corrections.forEach(correction => {
      const similarity = this.calculateWeightedContextSimilarity(newContext, correction.context);
      maxSimilarity = Math.max(maxSimilarity, similarity);
    });
    
    return maxSimilarity;
  }

  /**
   * Weighted context similarity calculation
   */
  private calculateWeightedContextSimilarity(
    context1: AnalysisContext,
    context2: AnalysisContext
  ): number {
    const temporalSim = this.calculateTemporalSimilarity(context1, context2);
    const locationSim = context1.locationHistory && context2.locationHistory ? 
      this.calculateLocationSimilarity(context1.locationHistory, context2.locationHistory) : 0.5;
    
    return (
      temporalSim * this.CONTEXT_WEIGHTS.temporal +
      locationSim * this.CONTEXT_WEIGHTS.location +
      0.5 * (this.CONTEXT_WEIGHTS.sensor + this.CONTEXT_WEIGHTS.personal) // Default for missing data
    );
  }

  /**
   * Enhanced temporal similarity with multiple time scales
   */
  private calculateTemporalSimilarity(context1: AnalysisContext, context2: AnalysisContext): number {
    let similarity = 0;
    
    // Same time of day (strongest signal)
    if (context1.timeOfDay === context2.timeOfDay) {
      similarity += 0.4;
    }
    
    // Similar hour (within 2 hours)
    const hourDiff = Math.abs(context1.hourOfDay - context2.hourOfDay);
    if (hourDiff <= 2 || hourDiff >= 22) { // Handle wrap-around
      similarity += 0.3;
    }
    
    // Same day type (weekend vs weekday)
    if (context1.isWeekend === context2.isWeekend) {
      similarity += 0.2;
    }
    
    // Season similarity (simplified)
    const month1 = context1.timestamp.getMonth();
    const month2 = context2.timestamp.getMonth();
    const monthDiff = Math.abs(month1 - month2);
    if (monthDiff <= 1 || monthDiff >= 11) {
      similarity += 0.1;
    }
    
    return Math.min(1, similarity);
  }

  /**
   * Calculate location similarity
   */
  private calculateLocationSimilarity(
    history1: Array<{ context: string; timestamp: Date }>,
    history2: Array<{ context: string; timestamp: Date }>
  ): number {
    if (history1.length === 0 || history2.length === 0) return 0.5;
    
    const recent1 = history1[history1.length - 1];
    const recent2 = history2[history2.length - 1];
    
    return recent1.context === recent2.context ? 1.0 : 0.3;
  }

  /**
   * Infer user confidence from correction patterns
   */
  private inferUserConfidence(
    original: Vibe,
    chosen: Vibe,
    corrections: UserCorrection[]
  ): number {
    // Base confidence on correction strength
    const strength = this.calculateCorrectionStrength(original, chosen);
    
    // Adjust based on user's historical consistency
    const consistencyScore = this.calculateUserConsistency(corrections);
    
    // Higher confidence for stronger corrections and consistent users
    return Math.min(1, 0.5 + strength * 0.3 + consistencyScore * 0.2);
  }

  /**
   * Calculate user consistency score
   */
  private calculateUserConsistency(corrections: UserCorrection[]): number {
    if (corrections.length < 5) return 0.5;
    
    const recentCorrections = corrections.slice(-10); // Last 10 corrections
    const vibeFrequency: Record<string, number> = {};
    
    recentCorrections.forEach(correction => {
      vibeFrequency[correction.userChoice] = (vibeFrequency[correction.userChoice] || 0) + 1;
    });
    
    const maxFreq = Math.max(...Object.values(vibeFrequency));
    return maxFreq / recentCorrections.length;
  }

  /**
   * Enhanced vibe preferences with confidence weighting
   */
  private calculateEnhancedVibePreferences(corrections: UserCorrection[]): Partial<Record<Vibe, number>> {
    const preferences: Partial<Record<Vibe, number>> = {};
    const vibeCounts: Record<string, { 
      chosen: number; 
      suggested: number; 
      totalConfidence: number;
      recentWeight: number;
    }> = {};
    
    corrections.forEach((correction, index) => {
      const recencyWeight = Math.pow(this.RECENCY_DECAY, corrections.length - index - 1);
      const confidenceWeight = correction.confidence || 0.5;
      
      // Count user choices with confidence and recency weighting
      if (!vibeCounts[correction.userChoice]) {
        vibeCounts[correction.userChoice] = { chosen: 0, suggested: 0, totalConfidence: 0, recentWeight: 0 };
      }
      vibeCounts[correction.userChoice].chosen += recencyWeight * confidenceWeight;
      vibeCounts[correction.userChoice].totalConfidence += confidenceWeight;
      vibeCounts[correction.userChoice].recentWeight += recencyWeight;
      
      // Count system suggestions
      if (!vibeCounts[correction.originalSuggestion]) {
        vibeCounts[correction.originalSuggestion] = { chosen: 0, suggested: 0, totalConfidence: 0, recentWeight: 0 };
      }
      vibeCounts[correction.originalSuggestion].suggested += recencyWeight;
    });
    
    // Calculate enhanced preference scores
    Object.entries(vibeCounts).forEach(([vibe, counts]) => {
      if (counts.suggested > 0) {
        const choiceRate = counts.chosen / corrections.length;
        const suggestionRate = counts.suggested / corrections.length;
        const confidenceBoost = counts.totalConfidence / Math.max(1, counts.chosen);
        const recencyBoost = counts.recentWeight / Math.max(1, counts.chosen);
        
        const preference = (choiceRate - suggestionRate) * confidenceBoost * recencyBoost * 2;
        preferences[vibe as Vibe] = Math.max(-0.4, Math.min(0.4, preference));
      }
    });
    
    return preferences;
  }

  /**
   * Extract contextual patterns from corrections
   */
  private extractContextualPatterns(corrections: UserCorrection[]): Array<{
    context: string;
    preferredVibe: Vibe;
    confidence: number;
  }> {
    const patterns: Record<string, Record<Vibe, number>> = {};
    
    corrections.forEach(correction => {
      const contextKey = this.getContextKey(correction.context, correction.sensorData);
      
      if (!patterns[contextKey]) {
        patterns[contextKey] = {} as Record<Vibe, number>;
      }
      
      patterns[contextKey][correction.userChoice] = 
        (patterns[contextKey][correction.userChoice] || 0) + 1;
    });
    
    // Convert to pattern array
    const result: Array<{ context: string; preferredVibe: Vibe; confidence: number }> = [];
    
    Object.entries(patterns).forEach(([context, vibeFreqs]) => {
      const total = Object.values(vibeFreqs).reduce((sum, count) => sum + count, 0);
      
      if (total >= 3) { // Only include patterns with sufficient data
        const sortedVibes = Object.entries(vibeFreqs)
          .sort(([,a], [,b]) => b - a);
        
        const preferredVibe = sortedVibes[0][0] as Vibe;
        const confidence = sortedVibes[0][1] / total;
        
        if (confidence > 0.6) { // Only strong patterns
          result.push({ context, preferredVibe, confidence });
        }
      }
    });
    
    return result.slice(0, 10); // Limit to top 10 patterns
  }

  /**
   * Extract advanced contextual patterns with frequency and recency
   */
  private extractAdvancedContextualPatterns(corrections: UserCorrection[]): PersonalFactors['contextualPatterns'] {
    const patterns: PersonalFactors['contextualPatterns'] = [];
    const patternFrequency: Record<string, number> = {};
    const patternRecency: Record<string, number> = {};
    
    corrections.forEach((correction, index) => {
      const contextKey = this.getContextKey(correction.context, correction.sensorData);
      const recencyWeight = Math.pow(this.RECENCY_DECAY, corrections.length - index - 1);
      
      if (!patternFrequency[contextKey]) {
        patternFrequency[contextKey] = 0;
        patternRecency[contextKey] = 0;
      }
      patternFrequency[contextKey]++;
      patternRecency[contextKey] += recencyWeight;
    });
    
    Object.entries(patternFrequency).forEach(([context, freq]) => {
      const recency = patternRecency[context] / freq;
      const confidence = freq / corrections.length;
      
      if (confidence > 0.1) { // Only include patterns with sufficient data
        patterns.push({
          context,
          preferredVibe: this.extractPreferredVibe(context, corrections),
          confidence,
          frequency: freq,
          recency: recency
        });
      }
    });
    
    return patterns.sort((a, b) => b.confidence - a.confidence).slice(0, 10); // Limit to top 10
  }

  /**
   * Extract preferred vibe from a pattern
   */
  private extractPreferredVibe(context: string, corrections: UserCorrection[]): Vibe {
    const vibeCounts: Record<Vibe, number> = {};
    const totalConfidence = corrections.length;
    
    corrections.forEach(correction => {
      const contextKey = this.getContextKey(correction.context, correction.sensorData);
      if (contextKey === context) {
        vibeCounts[correction.userChoice] = (vibeCounts[correction.userChoice] || 0) + 1;
      }
    });
    
    const sortedVibes = Object.entries(vibeCounts)
      .sort(([,a], [,b]) => b - a);
    
    return sortedVibes[0][0] as Vibe;
  }

  /**
   * Generate context key for pattern recognition
   */
  private getContextKey(context: AnalysisContext, sensors: SensorData): string {
    const timePeriod = context.timeOfDay;
    const dayType = context.isWeekend ? 'weekend' : 'weekday';
    const movement = sensors.movement.pattern;
    const audioLevel = sensors.audioLevel > 50 ? 'loud' : 'quiet';
    const location = sensors.location.context;
    
    return `${timePeriod}-${dayType}-${movement}-${audioLevel}-${location}`;
  }

     /**
    * Generate context key for advanced pattern recognition
    */
   private getSimplifiedContextKey(context: AnalysisContext): string {
     const timePeriod = context.timeOfDay;
     const dayType = context.isWeekend ? 'weekend' : 'weekday';
     const movement = 'still'; // Simplified for now
     const audioLevel = 'quiet'; // Simplified for now
     const location = context.locationHistory?.[context.locationHistory.length - 1]?.context || 'unknown';
     
     return `${timePeriod}-${dayType}-${movement}-${audioLevel}-${location}`;
   }

  /**
   * Calculate accuracy of our suggestions vs user choices
   */
  private calculateAccuracy(corrections: UserCorrection[]): number {
    if (corrections.length === 0) return 0.5;
    
    const matches = corrections.filter(c => c.originalSuggestion === c.userChoice).length;
    const accuracy = matches / corrections.length;
    
    // Apply smoothing - start with 50% and adjust based on data
    return 0.5 + (accuracy - 0.5) * 0.8;
  }

  /**
   * Calculate dynamic accuracy based on recent corrections
   */
  private calculateDynamicAccuracy(corrections: UserCorrection[]): number {
    if (corrections.length === 0) return 0.5;
    
    const recentCorrections = corrections.slice(-10); // Last 10 corrections
    const matches = recentCorrections.filter(c => c.originalSuggestion === c.userChoice).length;
    const accuracy = matches / recentCorrections.length;
    
    return 0.5 + (accuracy - 0.5) * 0.8; // Apply smoothing to recent data
  }

  /**
   * Calculate adaptive learning rate
   */
  private calculateAdaptiveLearningRate(corrections: UserCorrection[]): number {
    if (corrections.length < 5) return this.BASE_LEARNING_RATE;
    
    const recentCorrections = corrections.slice(-10); // Last 10 corrections
    const consistencyScore = this.calculateUserConsistency(recentCorrections);
    
    // Higher consistency = lower learning rate
    return Math.max(this.BASE_LEARNING_RATE, this.MAX_LEARNING_RATE * (1 - consistencyScore));
  }

  /**
   * Calculate relevance of personal data for current context
   */
  private calculateRelevance(
    relevantCorrections: UserCorrection[],
    allCorrections: UserCorrection[]
  ): number {
    if (allCorrections.length < this.MIN_CORRECTIONS_FOR_LEARNING) {
      return 0;
    }
    
    const relevantRatio = relevantCorrections.length / allCorrections.length;
    const dataAmount = Math.min(1, allCorrections.length / 20); // More data = more relevance
    
    return relevantRatio * dataAmount;
  }

  /**
   * Calculate enhanced relevance based on context similarity and correction strength
   */
  private calculateEnhancedRelevance(
    relevantCorrections: UserCorrection[],
    allCorrections: UserCorrection[],
    context: AnalysisContext
  ): number {
    if (allCorrections.length < this.MIN_CORRECTIONS_FOR_LEARNING) {
      return 0;
    }
    
    const contextSimilarity = this.calculateContextSimilarity(context, allCorrections);
    const correctionStrength = this.calculateCorrectionStrength(
      allCorrections[allCorrections.length - 1]?.originalSuggestion || 'chill',
      allCorrections[allCorrections.length - 1]?.userChoice || 'chill'
    );
    
    // Combine relevance based on context similarity and correction strength
    return Math.min(1, contextSimilarity * 0.6 + correctionStrength * 0.4);
  }

  /**
   * Generate description of learning state
   */
  private generateDescription(
    preferences: Partial<Record<Vibe, number>>,
    patterns: Array<{ context: string; preferredVibe: Vibe; confidence: number }>
  ): string {
    const strongPrefs = Object.entries(preferences)
      .filter(([_, pref]) => Math.abs(pref!) > 0.15)
      .sort(([,a], [,b]) => Math.abs(b!) - Math.abs(a!))
      .slice(0, 2);
    
    if (strongPrefs.length > 0) {
      const prefType = strongPrefs[0][1]! > 0 ? 'prefers' : 'avoids';
      return `Personal pattern: ${prefType} ${strongPrefs[0][0]}`;
    }
    
    if (patterns.length > 0) {
      return `Personal pattern: contextual preferences detected`;
    }
    
    return 'Learning your preferences...';
  }

  /**
   * Generate advanced description of learning state
   */
  private generateAdvancedDescription(
    preferences: Partial<Record<Vibe, number>>,
    patterns: PersonalFactors['contextualPatterns'],
    personality: PersonalFactors['personalityProfile']
  ): string {
    const strongPrefs = Object.entries(preferences)
      .filter(([_, pref]) => Math.abs(pref!) > 0.15)
      .sort(([,a], [,b]) => Math.abs(b!) - Math.abs(a!))
      .slice(0, 2);
    
    if (strongPrefs.length > 0) {
      const prefType = strongPrefs[0][1]! > 0 ? 'prefers' : 'avoids';
      return `Personal pattern: ${prefType} ${strongPrefs[0][0]}`;
    }
    
    if (patterns.length > 0) {
      return `Personal pattern: contextual preferences detected`;
    }

    if (personality.consistencyScore > 0.7) {
      return `You have a consistent personality.`;
    }

    if (personality.adaptabilityScore > 0.7) {
      return `You adapt well to different contexts.`;
    }
    
    return 'Learning your preferences...';
  }

  /**
   * Load corrections from localStorage
   */
  private loadCorrections(): UserCorrection[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];
      
      const parsed = JSON.parse(stored);
      return parsed.map((c: any) => ({
        ...c,
        timestamp: new Date(c.timestamp),
        context: {
          ...c.context,
          timestamp: new Date(c.context.timestamp)
        }
      }));
    } catch (error) {
      console.warn('Failed to load user corrections:', error);
      return [];
    }
  }

  /**
   * Save corrections to localStorage
   */
  private saveCorrections(corrections: UserCorrection[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(corrections));
    } catch (error) {
      console.warn('Failed to save user corrections:', error);
    }
  }

  /**
   * Smart pruning of corrections to maintain size
   */
  private smartPruneCorrections(corrections: UserCorrection[]): void {
    const correctionsToKeep = corrections.slice(0, this.MAX_CORRECTIONS);
    this.saveCorrections(correctionsToKeep);
  }

     /**
    * Extract sensor data from context for correction recording
    */
   private extractSensorDataFromContext(context: AnalysisContext): SensorData {
     return {
       audioLevel: 50, // Default value - would be populated from actual sensor data
       lightLevel: 50, // Default value - would be populated from actual sensor data
       movement: {
         intensity: 10,
         pattern: 'still' as const,
         frequency: 0
       },
       location: {
         context: context.locationHistory?.[context.locationHistory.length - 1]?.context as any || 'unknown',
         density: 0
       }
     };
   }
}