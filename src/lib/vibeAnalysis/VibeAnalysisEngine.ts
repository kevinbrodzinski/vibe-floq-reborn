import type { Vibe } from '@/types/vibes';
import { SensorFusion } from './SensorFusion';
import { TemporalContext } from './TemporalContext';
import { ConfidenceCalculator } from './ConfidenceCalculator';
import { UserLearningSystem } from './UserLearningSystem';

// New ML enhancement imports
interface MLFeatureVector {
  // Basic features
  energy: number;
  social: number;
  focus: number;
  mood: number;
  
  // Engineered features
  energySocialRatio: number;
  focusMoodBalance: number;
  temporalMomentum: number;
  sensorCoherence: number;
  
  // Context features
  timeOfDayEncoded: number[];
  locationContextEncoded: number[];
  movementPatternEncoded: number[];
  
  // Meta features
  signalQuality: number;
  anomalyLevel: number;
  historicalConsistency: number;
}

interface EnsembleModel {
  weights: Record<string, number>;
  models: {
    ruleBasedClassifier: (features: MLFeatureVector) => Record<Vibe, number>;
    temporalPatternClassifier: (features: MLFeatureVector) => Record<Vibe, number>;
    contextualClassifier: (features: MLFeatureVector) => Record<Vibe, number>;
    personalityClassifier: (features: MLFeatureVector) => Record<Vibe, number>;
  };
}

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
  // Enhanced ML analysis results
  mlAnalysis: {
    featureVector: MLFeatureVector;
    ensembleScores: Record<Vibe, number>;
    modelContributions: Record<string, number>;
    uncertaintyEstimate: number;
    predictionInterval: { lower: number; upper: number };
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
 * Enhanced Vibe Analysis Engine with Advanced ML
 * 
 * Replaces simple rule-based detection with sophisticated ensemble learning,
 * feature engineering, and uncertainty quantification.
 */
export class VibeAnalysisEngine {
  private sensorFusion: SensorFusion;
  private temporalContext: TemporalContext;
  private confidenceCalculator: ConfidenceCalculator;
  private userLearning: UserLearningSystem;
  
  // ML enhancement components
  private ensembleModel: EnsembleModel;
  private featureHistory: MLFeatureVector[] = [];
  private readonly FEATURE_HISTORY_SIZE = 20;
  
  // Feature engineering parameters
  private readonly VIBE_EMBEDDINGS = {
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

  constructor() {
    this.sensorFusion = new SensorFusion();
    this.temporalContext = new TemporalContext();
    this.confidenceCalculator = new ConfidenceCalculator();
    this.userLearning = new UserLearningSystem();
    
    // Initialize ensemble model
    this.ensembleModel = this.initializeEnsembleModel();
  }

  /**
   * Enhanced main analysis method with ML ensemble
   */
  async analyzeVibe(
    sensors: SensorData, 
    context?: Partial<AnalysisContext>
  ): Promise<VibeAnalysisResult> {
    // Build full context
    const fullContext = this.buildAnalysisContext(context);
    
    // Step 1: Enhanced sensor fusion
    const fusionResult = this.sensorFusion.fuseSensorData(sensors);
    
    // Step 2: Apply temporal context
    const temporalFactors = this.temporalContext.getTemporalFactors(fullContext);
    
    // Step 3: Get user learning adjustments
    const personalFactors = await this.userLearning.getPersonalFactors(sensors, fullContext);
    
    // Step 4: Feature engineering - create ML feature vector
    const featureVector = this.engineerFeatures(
      fusionResult, 
      temporalFactors, 
      personalFactors, 
      fullContext
    );
    
    // Step 5: Ensemble ML classification
    const ensembleScores = this.runEnsembleClassification(featureVector);
    
    // Step 6: Enhanced confidence calculation with uncertainty quantification
    const confidenceResult = this.calculateEnhancedConfidence(
      ensembleScores,
      fusionResult.quality,
      temporalFactors,
      personalFactors,
      featureVector
    );
    
    // Step 7: Update feature history for temporal learning
    this.updateFeatureHistory(featureVector);
    
    // Step 8: Generate enhanced reasoning with ML insights
    const reasoning = this.generateEnhancedReasoning(
      fusionResult, 
      temporalFactors, 
      personalFactors, 
      confidenceResult,
      featureVector,
      ensembleScores
    );
    
    return {
      suggestedVibe: confidenceResult.primaryVibe,
      confidence: confidenceResult.confidence,
      reasoning,
      alternatives: confidenceResult.alternatives,
      contextFactors: {
        temporal: temporalFactors.relevance,
        environmental: fusionResult.environmentalMatch,
        personal: personalFactors.relevance
      },
      sensorQuality: fusionResult.quality,
      learningBoost: confidenceResult.learningBoost,
      mlAnalysis: {
        featureVector,
        ensembleScores,
        modelContributions: this.calculateModelContributions(ensembleScores),
        uncertaintyEstimate: confidenceResult.uncertaintyEstimate,
        predictionInterval: confidenceResult.predictionInterval
      }
    };
  }

  /**
   * Advanced feature engineering
   */
  private engineerFeatures(
    fusionResult: any,
    temporalFactors: any,
    personalFactors: any,
    context: AnalysisContext
  ): MLFeatureVector {
    const { features } = fusionResult;
    
    // Basic features
    const basic = {
      energy: features.energy,
      social: features.social,
      focus: features.focus,
      mood: features.mood
    };
    
    // Engineered interaction features
    const energySocialRatio = features.social > 0 ? features.energy / features.social : features.energy;
    const focusMoodBalance = Math.abs(features.focus - features.mood);
    const temporalMomentum = this.calculateTemporalMomentum(features);
    const sensorCoherence = fusionResult.quality.crossCorrelation || 0.5;
    
    // Context encoding
    const timeOfDayEncoded = this.encodeTimeOfDay(context.timeOfDay);
    const locationContextEncoded = this.encodeLocationContext(fusionResult.rawSensors.location.context);
    const movementPatternEncoded = this.encodeMovementPattern(fusionResult.rawSensors.movement.pattern);
    
    // Meta features
    const signalQuality = fusionResult.quality.overall;
    const anomalyLevel = features.anomaly || 0;
    const historicalConsistency = this.calculateHistoricalConsistency();
    
    return {
      ...basic,
      energySocialRatio,
      focusMoodBalance,
      temporalMomentum,
      sensorCoherence,
      timeOfDayEncoded,
      locationContextEncoded,
      movementPatternEncoded,
      signalQuality,
      anomalyLevel,
      historicalConsistency
    };
  }

  /**
   * Initialize ensemble model with multiple classifiers
   */
  private initializeEnsembleModel(): EnsembleModel {
    return {
      weights: {
        ruleBasedClassifier: 0.3,
        temporalPatternClassifier: 0.25,
        contextualClassifier: 0.25,
        personalityClassifier: 0.2
      },
      models: {
        ruleBasedClassifier: this.createRuleBasedClassifier(),
        temporalPatternClassifier: this.createTemporalPatternClassifier(),
        contextualClassifier: this.createContextualClassifier(),
        personalityClassifier: this.createPersonalityClassifier()
      }
    };
  }

  /**
   * Run ensemble classification
   */
  private runEnsembleClassification(features: MLFeatureVector): Record<Vibe, number> {
    const models = this.ensembleModel.models;
    const weights = this.ensembleModel.weights;
    
    // Get predictions from each model
    const predictions = {
      ruleBased: models.ruleBasedClassifier(features),
      temporal: models.temporalPatternClassifier(features),
      contextual: models.contextualClassifier(features),
      personality: models.personalityClassifier(features)
    };
    
    // Weighted ensemble combination
    const ensembleScores: Record<Vibe, number> = {} as Record<Vibe, number>;
    const vibes: Vibe[] = ['chill', 'social', 'hype', 'solo', 'romantic', 'down', 'flowing', 'open', 'curious', 'weird', 'energetic', 'excited', 'focused'];
    
    vibes.forEach(vibe => {
      ensembleScores[vibe] = 
        (predictions.ruleBased[vibe] || 0) * weights.ruleBasedClassifier +
        (predictions.temporal[vibe] || 0) * weights.temporalPatternClassifier +
        (predictions.contextual[vibe] || 0) * weights.contextualClassifier +
        (predictions.personality[vibe] || 0) * weights.personalityClassifier;
    });
    
    // Normalize scores
    const totalScore = Object.values(ensembleScores).reduce((sum, score) => sum + score, 0);
    if (totalScore > 0) {
      vibes.forEach(vibe => {
        ensembleScores[vibe] /= totalScore;
      });
    }
    
    return ensembleScores;
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
      weird: 0,
      energetic: 0,
      excited: 0,
      focused: 0
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

     /**
    * Enhanced confidence calculation with uncertainty quantification
    */
   private calculateEnhancedConfidence(
     ensembleScores: Record<Vibe, number>,
     sensorQuality: any,
     temporalFactors: any,
     personalFactors: any,
     featureVector: MLFeatureVector
   ): {
     primaryVibe: Vibe;
     confidence: number;
     alternatives: Array<{ vibe: Vibe; confidence: number }>;
     learningBoost?: {
       boosted: boolean;
       boostFactor: number;
       originalConfidence: number;
     };
     uncertaintyEstimate: number;
     predictionInterval: { lower: number; upper: number };
   } {
    const primaryVibe = this.getPrimaryVibe(ensembleScores);
    const confidence = ensembleScores[primaryVibe];

    // Calculate uncertainty estimate (e.g., standard deviation of ensemble scores)
    const ensembleStdDev = this.calculateEnsembleUncertainty(ensembleScores);

    // Calculate prediction interval (e.g., 95% confidence interval)
    const predictionInterval = this.calculatePredictionInterval(confidence, ensembleStdDev);

    // Determine learning boost
    const personalBoost = personalFactors.vibePreferences[primaryVibe] || 0;
    const hasPersonalBoost = personalBoost > 0.1; // Significant personal preference

    // Lower threshold for learned preferences (0.5 → 0.3-0.4)
    const adjustedConfidence = hasPersonalBoost 
      ? Math.min(1.0, confidence * (1 + personalBoost * 0.5))
      : confidence;

    // Generate alternatives
    const alternatives = this.generateAlternatives(ensembleScores);

         return {
       primaryVibe,
       confidence: adjustedConfidence,
       alternatives,
       learningBoost: hasPersonalBoost ? {
         boosted: true,
         boostFactor: personalBoost,
         originalConfidence: confidence
       } : undefined,
       uncertaintyEstimate: ensembleStdDev,
       predictionInterval
     };
  }

  /**
   * Get the primary vibe from ensemble scores
   */
  private getPrimaryVibe(ensembleScores: Record<Vibe, number>): Vibe {
    let primaryVibe: Vibe = 'chill'; // Default
    let maxScore = -Infinity;

    for (const vibe in ensembleScores) {
      if (ensembleScores[vibe] > maxScore) {
        maxScore = ensembleScores[vibe];
        primaryVibe = vibe as Vibe;
      }
    }
    return primaryVibe;
  }

  /**
   * Calculate uncertainty estimate (e.g., standard deviation of ensemble scores)
   */
  private calculateEnsembleUncertainty(ensembleScores: Record<Vibe, number>): number {
    const scores = Object.values(ensembleScores);
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    return Math.sqrt(variance);
  }

  /**
   * Calculate prediction interval (e.g., 95% confidence interval)
   */
  private calculatePredictionInterval(confidence: number, stdDev: number): { lower: number; upper: number } {
    const lowerBound = Math.max(0, confidence - 2 * stdDev);
    const upperBound = Math.min(1, confidence + 2 * stdDev);
    return { lower: lowerBound, upper: upperBound };
  }

  /**
   * Generate alternatives based on ensemble scores
   */
  private generateAlternatives(ensembleScores: Record<Vibe, number>): Array<{ vibe: Vibe; confidence: number }> {
    const alternatives: Array<{ vibe: Vibe; confidence: number }> = [];
    const sortedScores = Object.entries(ensembleScores).sort(([, a], [, b]) => b[1] - a[1]);

    for (let i = 0; i < sortedScores.length; i++) {
      const [vibe, score] = sortedScores[i];
      if (i === 0) {
        alternatives.push({ vibe: vibe as Vibe, confidence: score });
      } else {
        alternatives.push({ vibe: vibe as Vibe, confidence: score });
      }
    }
    return alternatives;
  }

  /**
   * Update feature history for temporal learning
   */
  private updateFeatureHistory(featureVector: MLFeatureVector): void {
    this.featureHistory.push(featureVector);
    if (this.featureHistory.length > this.FEATURE_HISTORY_SIZE) {
      this.featureHistory.shift();
    }
  }

  /**
   * Calculate historical consistency
   */
  private calculateHistoricalConsistency(): number {
    if (this.featureHistory.length < 2) {
      return 0; // Not enough history for consistency
    }

    const currentFeatures = this.featureHistory[this.featureHistory.length - 1];
    const previousFeatures = this.featureHistory[this.featureHistory.length - 2];

    let consistency = 0;
    for (const vibe in this.VIBE_EMBEDDINGS) {
      const currentEmbedding = this.VIBE_EMBEDDINGS[vibe as Vibe];
      const previousEmbedding = this.VIBE_EMBEDDINGS[vibe as Vibe];

      const distance = this.calculateEmbeddingDistance(currentEmbedding, previousEmbedding);
      consistency += distance;
    }
    return 1 - (consistency / (this.VIBE_EMBEDDINGS.length * 2)); // Inverse consistency
  }

  /**
   * Calculate embedding distance
   */
  private calculateEmbeddingDistance(emb1: number[], emb2: number[]): number {
    let sumSquaredDiff = 0;
    for (let i = 0; i < emb1.length; i++) {
      sumSquaredDiff += Math.pow(emb1[i] - emb2[i], 2);
    }
    return Math.sqrt(sumSquaredDiff);
  }

     /**
    * Calculate temporal momentum
    */
   private calculateTemporalMomentum(features: any): number {
     if (this.featureHistory.length < 2) {
       return 0; // Not enough history for momentum
     }

     const currentFeatures = this.featureHistory[this.featureHistory.length - 1];
     const previousFeatures = this.featureHistory[this.featureHistory.length - 2];

     const currentEnergy = currentFeatures.energy;
     const previousEnergy = previousFeatures.energy;

     const energyChange = Math.abs(currentEnergy - previousEnergy);
     
     // Simple momentum calculation without timestamp dependency for now
     return energyChange;
   }

  /**
   * Encode time of day
   */
  private encodeTimeOfDay(timeOfDay: AnalysisContext['timeOfDay']): number[] {
    switch (timeOfDay) {
      case 'early-morning': return [1, 0, 0, 0, 0, 0];
      case 'morning': return [0, 1, 0, 0, 0, 0];
      case 'afternoon': return [0, 0, 1, 0, 0, 0];
      case 'evening': return [0, 0, 0, 1, 0, 0];
      case 'night': return [0, 0, 0, 0, 1, 0];
      case 'late-night': return [0, 0, 0, 0, 0, 1];
      default: return [0, 0, 0, 0, 0, 0];
    }
  }

  /**
   * Encode location context
   */
  private encodeLocationContext(context: SensorData['location']['context']): number[] {
    switch (context) {
      case 'indoor': return [1, 0, 0, 0, 0];
      case 'outdoor': return [0, 1, 0, 0, 0];
      case 'venue': return [0, 0, 1, 0, 0];
      case 'transport': return [0, 0, 0, 1, 0];
      case 'unknown': return [0, 0, 0, 0, 1];
      default: return [0, 0, 0, 0, 0];
    }
  }

  /**
   * Encode movement pattern
   */
  private encodeMovementPattern(pattern: SensorData['movement']['pattern']): number[] {
    switch (pattern) {
      case 'still': return [1, 0, 0, 0];
      case 'walking': return [0, 1, 0, 0];
      case 'dancing': return [0, 0, 1, 0];
      case 'active': return [0, 0, 0, 1];
      default: return [0, 0, 0, 0];
    }
  }

  /**
   * Create a rule-based classifier (example)
   */
  private createRuleBasedClassifier(): (features: MLFeatureVector) => Record<Vibe, number> {
    return (features: MLFeatureVector) => {
      const scores: Record<Vibe, number> = {
        chill: 0, social: 0, hype: 0, solo: 0, romantic: 0, down: 0, flowing: 0, open: 0, curious: 0, weird: 0, energetic: 0, excited: 0, focused: 0
      };

      // Energy-based rules
      if (features.energy < 0.3) {
        scores.down += 0.4; scores.chill += 0.3; scores.solo += 0.2;
      } else if (features.energy > 0.7) {
        scores.hype += 0.4; scores.flowing += 0.3; scores.open += 0.2;
      }

      // Social-based rules
      if (features.social > 0.6) {
        scores.social += 0.4; scores.hype += 0.2; scores.open += 0.2;
      } else if (features.social < 0.3) {
        scores.solo += 0.4; scores.down += 0.2; scores.curious += 0.1;
      }

      // Focus-based rules
      if (features.focus > 0.6) {
        scores.solo += 0.3; scores.curious += 0.3;
      } else if (features.focus < 0.3) {
        scores.flowing += 0.2; scores.chill += 0.2;
      }

      // Mood-based rules
      if (features.mood > 0.7) {
        scores.open += 0.3; scores.social += 0.2;
      } else if (features.mood < 0.3) {
        scores.down += 0.3; scores.romantic += 0.2;
      }

      // Apply temporal adjustments
      Object.keys(scores).forEach(vibe => {
        const temporalBoost = this.VIBE_EMBEDDINGS[vibe as Vibe][4] || 0; // Temporal boost is the 5th element
        scores[vibe as Vibe] *= (1 + temporalBoost);
      });

      // Apply personal pattern adjustments
      Object.keys(scores).forEach(vibe => {
        const personalBoost = this.VIBE_EMBEDDINGS[vibe as Vibe][5] || 0; // Personal boost is the 6th element
        scores[vibe as Vibe] *= (1 + personalBoost);
      });

      // Handle edge cases and unusual combinations
      if (features.anomaly > 0.5) {
        scores.weird += 0.5;
      }

      return scores;
    };
  }

  /**
   * Create a temporal pattern classifier (example)
   */
  private createTemporalPatternClassifier(): (features: MLFeatureVector) => Record<Vibe, number> {
    return (features: MLFeatureVector) => {
      const scores: Record<Vibe, number> = {
        chill: 0, social: 0, hype: 0, solo: 0, romantic: 0, down: 0, flowing: 0, open: 0, curious: 0, weird: 0, energetic: 0, excited: 0, focused: 0
      };

      // Temporal momentum rules
      if (features.temporalMomentum > 0.5) {
        scores.hype += 0.3; scores.flowing += 0.2; scores.open += 0.1;
      } else if (features.temporalMomentum < 0.1) {
        scores.down += 0.3; scores.chill += 0.2;
      }

      // Apply temporal adjustments
      Object.keys(scores).forEach(vibe => {
        const temporalBoost = this.VIBE_EMBEDDINGS[vibe as Vibe][4] || 0; // Temporal boost is the 5th element
        scores[vibe as Vibe] *= (1 + temporalBoost);
      });

      // Apply personal pattern adjustments
      Object.keys(scores).forEach(vibe => {
        const personalBoost = this.VIBE_EMBEDDINGS[vibe as Vibe][5] || 0; // Personal boost is the 6th element
        scores[vibe as Vibe] *= (1 + personalBoost);
      });

      // Handle edge cases and unusual combinations
      if (features.anomaly > 0.5) {
        scores.weird += 0.5;
      }

      return scores;
    };
  }

  /**
   * Create a contextual classifier (example)
   */
  private createContextualClassifier(): (features: MLFeatureVector) => Record<Vibe, number> {
    return (features: MLFeatureVector) => {
      const scores: Record<Vibe, number> = {
        chill: 0, social: 0, hype: 0, solo: 0, romantic: 0, down: 0, flowing: 0, open: 0, curious: 0, weird: 0, energetic: 0, excited: 0, focused: 0
      };

      // Context-based rules
      if (features.locationContextEncoded[2] === 1) { // Venue context
        scores.social += 0.3; scores.hype += 0.2; scores.open += 0.1;
      } else if (features.locationContextEncoded[3] === 1) { // Transport context
        scores.down += 0.3; scores.chill += 0.2;
      }

      // Apply temporal adjustments
      Object.keys(scores).forEach(vibe => {
        const temporalBoost = this.VIBE_EMBEDDINGS[vibe as Vibe][4] || 0; // Temporal boost is the 5th element
        scores[vibe as Vibe] *= (1 + temporalBoost);
      });

      // Apply personal pattern adjustments
      Object.keys(scores).forEach(vibe => {
        const personalBoost = this.VIBE_EMBEDDINGS[vibe as Vibe][5] || 0; // Personal boost is the 6th element
        scores[vibe as Vibe] *= (1 + personalBoost);
      });

      // Handle edge cases and unusual combinations
      if (features.anomaly > 0.5) {
        scores.weird += 0.5;
      }

      return scores;
    };
  }

  /**
   * Create a personality classifier (example)
   */
  private createPersonalityClassifier(): (features: MLFeatureVector) => Record<Vibe, number> {
    return (features: MLFeatureVector) => {
      const scores: Record<Vibe, number> = {
        chill: 0, social: 0, hype: 0, solo: 0, romantic: 0, down: 0, flowing: 0, open: 0, curious: 0, weird: 0, energetic: 0, excited: 0, focused: 0
      };

      // Personality-based rules
      if (features.energySocialRatio > 1.5) {
        scores.social += 0.3; scores.hype += 0.2; scores.open += 0.1;
      } else if (features.energySocialRatio < 0.5) {
        scores.down += 0.3; scores.chill += 0.2;
      }

      // Focus-Mood balance rules
      if (features.focusMoodBalance < 0.3) {
        scores.flowing += 0.2; scores.chill += 0.2;
      } else if (features.focusMoodBalance > 0.7) {
        scores.open += 0.3; scores.social += 0.2;
      }

      // Apply temporal adjustments
      Object.keys(scores).forEach(vibe => {
        const temporalBoost = this.VIBE_EMBEDDINGS[vibe as Vibe][4] || 0; // Temporal boost is the 5th element
        scores[vibe as Vibe] *= (1 + temporalBoost);
      });

      // Apply personal pattern adjustments
      Object.keys(scores).forEach(vibe => {
        const personalBoost = this.VIBE_EMBEDDINGS[vibe as Vibe][5] || 0; // Personal boost is the 6th element
        scores[vibe as Vibe] *= (1 + personalBoost);
      });

      // Handle edge cases and unusual combinations
      if (features.anomaly > 0.5) {
        scores.weird += 0.5;
      }

      return scores;
    };
  }

     /**
    * Calculate model contributions
    */
   private calculateModelContributions(ensembleScores: Record<Vibe, number>): Record<string, number> {
     const totalScore = Object.values(ensembleScores).reduce((sum, score) => sum + score, 0);
     if (totalScore === 0 || this.featureHistory.length === 0) return {};

     const contributions: Record<string, number> = {};
     const lastFeatureVector = this.featureHistory[this.featureHistory.length - 1];
     
     for (const modelName in this.ensembleModel.models) {
       const model = this.ensembleModel.models[modelName as keyof EnsembleModel['models']];
       const modelScores = model(lastFeatureVector);
       const modelScoreSum = Object.values(modelScores).reduce((sum, score) => sum + score, 0);

       if (modelScoreSum > 0) {
         contributions[modelName] = (modelScoreSum / totalScore) * 100; // Percentage contribution
       }
     }
     return contributions;
   }

     /**
    * Generate enhanced reasoning with ML insights
    */
   private generateEnhancedReasoning(
     fusionResult: any,
     temporalFactors: any,
     personalFactors: any,
     confidenceResult: any,
     featureVector: MLFeatureVector,
     ensembleScores: Record<Vibe, number>
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

    // ML model contributions
    const contributions = this.calculateModelContributions(ensembleScores);
    if (Object.keys(contributions).length > 0) {
      reasoning.push('ML Model Contributions:');
      for (const modelName in contributions) {
        reasoning.push(`- ${modelName}: ${contributions[modelName].toFixed(1)}%`);
      }
    }

    // Personal pattern reasoning
    if (personalFactors.relevance > 0.3) {
      reasoning.push(`Personal pattern: ${personalFactors.description}`);
      
      // Add learning boost reasoning
      if (confidenceResult.learningBoost?.boosted) {
        reasoning.push(`💡 Learned boost: You often choose ${confidenceResult.primaryVibe} in similar contexts`);
      }
    }
    
    // Confidence reasoning
    if (confidenceResult.confidence < 0.5) {
      reasoning.push('Low confidence due to conflicting signals');
    } else if (confidenceResult.confidence > 0.8) {
      reasoning.push('High confidence from strong signal alignment');
    }

    // Prediction interval
    if (confidenceResult.predictionInterval) {
      reasoning.push(`Prediction interval: ${confidenceResult.predictionInterval.lower.toFixed(2)} - ${confidenceResult.predictionInterval.upper.toFixed(2)}`);
    }

    return reasoning;
  }
}