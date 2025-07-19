import type { Vibe } from '@/types/vibes';
import type { AnalysisContext, SensorData } from './VibeAnalysisEngine';

export interface UserCorrection {
  originalSuggestion: Vibe;
  userChoice: Vibe;
  context: AnalysisContext;
  timestamp: Date;
  sensorData: SensorData;
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
  }>;
}

/**
 * User Learning System
 * 
 * Learns from user corrections to improve future suggestions.
 * Maintains privacy by storing data locally only.
 */
export class UserLearningSystem {
  private readonly STORAGE_KEY = 'vibe-user-learning';
  private readonly MAX_CORRECTIONS = 100; // Limit storage size
  private readonly MIN_CORRECTIONS_FOR_LEARNING = 5;

  /**
   * Get personal factors for current context
   */
  async getPersonalFactors(
    sensors: SensorData,
    context: AnalysisContext
  ): Promise<PersonalFactors> {
    const corrections = this.loadCorrections();
    
    if (corrections.length < this.MIN_CORRECTIONS_FOR_LEARNING) {
      return this.getDefaultPersonalFactors();
    }
    
    // Analyze corrections for patterns
    const relevantCorrections = this.findRelevantCorrections(corrections, sensors, context);
    const vibePreferences = this.calculateVibePreferences(corrections);
    const contextualPatterns = this.extractContextualPatterns(corrections);
    const accuracy = this.calculateAccuracy(corrections);
    
    return {
      relevance: this.calculateRelevance(relevantCorrections, corrections),
      accuracy,
      vibePreferences,
      description: this.generateDescription(vibePreferences, contextualPatterns),
      contextualPatterns
    };
  }

  /**
   * Record a user correction
   */
  async recordCorrection(
    originalSuggestion: Vibe,
    userChoice: Vibe,
    context: AnalysisContext
  ): Promise<void> {
    const corrections = this.loadCorrections();
    
    const newCorrection: UserCorrection = {
      originalSuggestion,
      userChoice,
      context,
      timestamp: new Date(),
      sensorData: context.userCorrections?.[0]?.context as any || {} as SensorData // Fallback
    };
    
    // Add new correction
    corrections.push(newCorrection);
    
    // Maintain size limit
    if (corrections.length > this.MAX_CORRECTIONS) {
      corrections.splice(0, corrections.length - this.MAX_CORRECTIONS);
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
      contextualPatterns: []
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
   * Calculate overall vibe preferences from corrections
   */
  private calculateVibePreferences(corrections: UserCorrection[]): Partial<Record<Vibe, number>> {
    const preferences: Partial<Record<Vibe, number>> = {};
    const vibeCounts: Record<string, { chosen: number; suggested: number }> = {};
    
    corrections.forEach(correction => {
      // Count how often user chose each vibe
      if (!vibeCounts[correction.userChoice]) {
        vibeCounts[correction.userChoice] = { chosen: 0, suggested: 0 };
      }
      vibeCounts[correction.userChoice].chosen++;
      
      // Count how often we suggested each vibe
      if (!vibeCounts[correction.originalSuggestion]) {
        vibeCounts[correction.originalSuggestion] = { chosen: 0, suggested: 0 };
      }
      vibeCounts[correction.originalSuggestion].suggested++;
    });
    
    // Calculate preference scores
    Object.entries(vibeCounts).forEach(([vibe, counts]) => {
      const totalSuggestions = counts.suggested;
      const totalChoices = counts.chosen;
      
      if (totalSuggestions > 0) {
        // Preference based on choice rate vs suggestion rate
        const choiceRate = totalChoices / corrections.length;
        const suggestionRate = totalSuggestions / corrections.length;
        const preference = (choiceRate - suggestionRate) * 2; // Scale to -2 to +2
        
        // Clamp to reasonable range
        preferences[vibe as Vibe] = Math.max(-0.3, Math.min(0.3, preference));
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
}