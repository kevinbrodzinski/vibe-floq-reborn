import type { Vibe } from '@/utils/vibe';
import { SensorFusion } from './SensorFusion';
import { TemporalContext } from './TemporalContext';
import { ConfidenceCalculator } from './ConfidenceCalculator';
import { UserLearningSystem } from './UserLearningSystem';

export interface SensorData {
  audioLevel: number; // 0-100
  lightLevel: number; // 0-100  
  movement: {
    intensity: number; // 0-100
    pattern: 'still' | 'walking' | 'dancing' | 'active';
    frequency: number; // Hz
  };
  location: {
    context: 'indoor' | 'outdoor' | 'venue' | 'transport' | 'unknown';
    density: number; // people/km²
  };
}

export interface VibeAnalysisResult {
  suggestedVibe: Vibe;
  confidence: number;
  reasoning: string[];
  alternatives: Array<{ vibe: Vibe; confidence: number }>;
  contextFactors: {
    temporal: number;
    environmental: number;
    personal: number;
  };
  sensorQuality: {
    audio: number;
    motion: number;
    light: number;
    location: number;
    overall: number;
  };
  learningBoost?: {
    boosted: boolean;
    boostFactor: number;
    originalConfidence: number;
  };
}

export interface AnalysisContext {
  timestamp: Date;
  dayOfWeek: number; // 0-6
  hourOfDay: number; // 0-23
  isWeekend: boolean;
  timeOfDay: 'early-morning' | 'morning' | 'afternoon' | 'evening' | 'night' | 'late-night';
  locationHistory?: Array<{ context: string; timestamp: Date }>;
  userCorrections?: Array<{ 
    originalSuggestion: Vibe; 
    userChoice: Vibe; 
    context: Partial<AnalysisContext>;
    timestamp: Date;
  }>;
}

/**
 * Enhanced Vibe Analysis Engine
 * 
 * Replaces simple rule-based detection with sophisticated multi-factor analysis
 * including temporal context, sensor fusion, and user learning.
 */
export class VibeAnalysisEngine {
  private sensorFusion: SensorFusion;
  private temporalContext: TemporalContext;
  private confidenceCalculator: ConfidenceCalculator;
  private userLearning: UserLearningSystem;

  constructor() {
    this.sensorFusion = new SensorFusion();
    this.temporalContext = new TemporalContext();
    this.confidenceCalculator = new ConfidenceCalculator();
    this.userLearning = new UserLearningSystem();
  }

  /**
   * Main analysis method - orchestrates all analysis components
   */
  async analyzeVibe(
    sensors: SensorData, 
    context?: Partial<AnalysisContext>
  ): Promise<VibeAnalysisResult> {
    // Build full context
    const fullContext = this.buildAnalysisContext(context);
    
    // Step 1: Sensor fusion and quality assessment
    const fusionResult = this.sensorFusion.fuseSensorData(sensors);
    
    // Step 2: Apply temporal context
    const temporalFactors = this.temporalContext.getTemporalFactors(fullContext);
    
    // Step 3: Get user learning adjustments
    const personalFactors = await this.userLearning.getPersonalFactors(sensors, fullContext);
    
    // Step 4: Multi-dimensional vibe classification
    const vibeScores = this.calculateVibeScores(fusionResult, temporalFactors, personalFactors);
    
    // Step 5: Calculate confidence and alternatives with personal boosts
    const confidenceResult = this.confidenceCalculator.calculateConfidence(
      vibeScores,
      fusionResult.quality,
      temporalFactors,
      personalFactors
    );
    
    // Apply personal preference boost to confidence
    const personalBoost = personalFactors.vibePreferences[confidenceResult.primaryVibe] || 0;
    const hasPersonalBoost = personalBoost > 0.1; // Significant personal preference
    
    // Lower threshold for learned preferences (0.5 → 0.3-0.4)
    const adjustedConfidence = hasPersonalBoost 
      ? Math.min(1.0, confidenceResult.confidence * (1 + personalBoost * 0.5))
      : confidenceResult.confidence;
    
    // Step 6: Generate reasoning
    const reasoning = this.generateReasoning(
      fusionResult, 
      temporalFactors, 
      personalFactors, 
      confidenceResult,
      hasPersonalBoost
    );
    
    return {
      suggestedVibe: confidenceResult.primaryVibe,
      confidence: adjustedConfidence,
      reasoning,
      alternatives: confidenceResult.alternatives,
      contextFactors: {
        temporal: temporalFactors.relevance,
        environmental: fusionResult.environmentalMatch,
        personal: personalFactors.relevance
      },
      sensorQuality: fusionResult.quality,
      // Add learning boost indicator
      learningBoost: hasPersonalBoost ? {
        boosted: true,
        boostFactor: personalBoost,
        originalConfidence: confidenceResult.confidence
      } : undefined
    };
  }

  /**
   * Record user feedback for learning system
   */
  async recordUserFeedback(
    originalResult: VibeAnalysisResult,
    userChoice: Vibe,
    context: AnalysisContext
  ): Promise<void> {
    await this.userLearning.recordCorrection(
      originalResult.suggestedVibe,
      userChoice,
      context
    );
  }

  /**
   * Build complete analysis context
   */
  private buildAnalysisContext(partial?: Partial<AnalysisContext>): AnalysisContext {
    const now = partial?.timestamp || new Date();
    const dayOfWeek = now.getDay();
    const hourOfDay = now.getHours();
    
    let timeOfDay: AnalysisContext['timeOfDay'];
    if (hourOfDay >= 5 && hourOfDay < 8) timeOfDay = 'early-morning';
    else if (hourOfDay >= 8 && hourOfDay < 12) timeOfDay = 'morning';
    else if (hourOfDay >= 12 && hourOfDay < 17) timeOfDay = 'afternoon';
    else if (hourOfDay >= 17 && hourOfDay < 21) timeOfDay = 'evening';
    else if (hourOfDay >= 21 && hourOfDay < 24) timeOfDay = 'night';
    else timeOfDay = 'late-night';

    return {
      timestamp: now,
      dayOfWeek,
      hourOfDay,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      timeOfDay,
      locationHistory: partial?.locationHistory || [],
      userCorrections: partial?.userCorrections || [],
      ...partial
    };
  }

  /**
   * Multi-dimensional vibe scoring
   */
  private calculateVibeScores(
    fusionResult: any,
    temporalFactors: any,
    personalFactors: any
  ): Record<Vibe, number> {
    const scores: Record<Vibe, number> = {
      chill: 0,
      social: 0,
      hype: 0,
      solo: 0,
      romantic: 0,
      down: 0,
      flowing: 0,
      open: 0,
      curious: 0,
      weird: 0
    };

    // Base sensor-driven scores
    const { features } = fusionResult;
    
    // Energy dimension (low to high)
    if (features.energy < 0.3) {
      scores.down += 0.4;
      scores.chill += 0.3;
      scores.solo += 0.2;
    } else if (features.energy > 0.7) {
      scores.hype += 0.4;
      scores.flowing += 0.3;
      scores.open += 0.2;
    }
    
    // Social dimension
    if (features.social > 0.6) {
      scores.social += 0.4;
      scores.hype += 0.2;
      scores.open += 0.2;
    } else if (features.social < 0.3) {
      scores.solo += 0.4;
      scores.down += 0.2;
      scores.curious += 0.1;
    }
    
    // Focus dimension
    if (features.focus > 0.6) {
      scores.solo += 0.3;
      scores.curious += 0.3;
    } else if (features.focus < 0.3) {
      scores.flowing += 0.2;
      scores.chill += 0.2;
    }
    
    // Mood dimension
    if (features.mood > 0.7) {
      scores.open += 0.3;
      scores.social += 0.2;
    } else if (features.mood < 0.3) {
      scores.down += 0.3;
      scores.romantic += 0.2;
    }
    
    // Apply temporal adjustments
    Object.keys(scores).forEach(vibe => {
      const temporalBoost = temporalFactors.vibeBoosts[vibe] || 0;
      scores[vibe as Vibe] *= (1 + temporalBoost);
    });
    
    // Apply personal pattern adjustments
    Object.keys(scores).forEach(vibe => {
      const personalBoost = personalFactors.vibePreferences[vibe] || 0;
      scores[vibe as Vibe] *= (1 + personalBoost);
    });
    
    // Handle edge cases and unusual combinations
    if (features.anomaly > 0.5) {
      scores.weird += 0.5;
    }
    
    return scores;
  }

  /**
   * Generate human-readable reasoning
   */
  private generateReasoning(
    fusionResult: any,
    temporalFactors: any,
    personalFactors: any,
    confidenceResult: any,
    hasPersonalBoost: boolean = false
  ): string[] {
    const reasoning: string[] = [];
    
    // Sensor-based reasoning
    if (fusionResult.dominantFactors.includes('audio')) {
      reasoning.push(`Audio: ${fusionResult.features.energy > 0.6 ? 'High energy' : 'Low energy'} environment`);
    }
    
    if (fusionResult.dominantFactors.includes('motion')) {
      reasoning.push(`Movement: ${fusionResult.rawSensors.movement.pattern} pattern detected`);
    }
    
    if (fusionResult.dominantFactors.includes('light')) {
      const lightDesc = fusionResult.rawSensors.lightLevel > 70 ? 'Bright' : 
                      fusionResult.rawSensors.lightLevel < 30 ? 'Dim' : 'Moderate';
      reasoning.push(`Lighting: ${lightDesc} environment`);
    }
    
    // Temporal reasoning
    if (temporalFactors.relevance > 0.3) {
      reasoning.push(`Time context: ${temporalFactors.description}`);
    }
    
    // Personal pattern reasoning
    if (personalFactors.relevance > 0.3) {
      reasoning.push(`Personal pattern: ${personalFactors.description}`);
      
      // Add learning boost reasoning
      if (hasPersonalBoost) {
        reasoning.push(`💡 Learned boost: You often choose ${confidenceResult.primaryVibe} in similar contexts`);
      }
    }
    
    // Confidence reasoning
    if (confidenceResult.confidence < 0.5) {
      reasoning.push('Low confidence due to conflicting signals');
    } else if (confidenceResult.confidence > 0.8) {
      reasoning.push('High confidence from strong signal alignment');
    }
    
    return reasoning;
  }
}