import type { Vibe } from '@/utils/vibe';
import type { SensorFeatures, SensorQuality } from './SensorFusion';
import type { TemporalFactors } from './TemporalContext';

export interface ConfidenceResult {
  primaryVibe: Vibe;
  confidence: number; // 0-1
  alternatives: Array<{ vibe: Vibe; confidence: number }>;
  reasoning: {
    sensorContribution: number;
    temporalContribution: number;
    personalContribution: number;
    crossValidation: number;
  };
}

/**
 * Confidence Calculator
 * 
 * Uses Bayesian probabilistic methods to calculate confidence scores
 * and provide alternative suggestions with their probabilities.
 */
export class ConfidenceCalculator {
  /**
   * Calculate confidence for vibe suggestions
   */
  calculateConfidence(
    vibeScores: Record<Vibe, number>,
    sensorQuality: SensorQuality,
    temporalFactors: TemporalFactors,
    personalFactors: any
  ): ConfidenceResult {
    // Step 1: Normalize vibe scores to probabilities
    let probabilities = this.normalizeToProbabilities(vibeScores);

    // Step 1.5: Apply personal bias if available
    if (personalFactors?.vibePreferences && Object.keys(personalFactors.vibePreferences).length > 0) {
      probabilities = this.applyPersonalBias(probabilities, personalFactors.vibePreferences);
    }
    
    // Step 2: Calculate base confidence from sensor quality
    const sensorContribution = this.calculateSensorContribution(sensorQuality);
    
    // Step 3: Apply temporal confidence boost
    const temporalContribution = this.calculateTemporalContribution(
      temporalFactors,
      probabilities
    );
    
    // Step 4: Apply personal pattern confidence
    const personalContribution = this.calculatePersonalContribution(personalFactors);
    
    // Step 5: Cross-validation confidence
    const crossValidation = this.calculateCrossValidation(
      probabilities,
      sensorQuality,
      temporalFactors
    );
    
    // Step 6: Combine all confidence factors
    const overallConfidence = this.combineConfidenceFactors({
      sensorContribution,
      temporalContribution,
      personalContribution,
      crossValidation
    });
    
    // Step 7: Select primary vibe and alternatives
    const sortedVibes = this.sortVibesByProbability(probabilities);
    const primaryVibe = sortedVibes[0].vibe;
    const alternatives = sortedVibes.slice(1, 4); // Top 3 alternatives
    
    // Step 8: Adjust alternative confidences
    const adjustedAlternatives = this.adjustAlternativeConfidences(
      alternatives,
      overallConfidence
    );
    
    return {
      primaryVibe,
      confidence: overallConfidence,
      alternatives: adjustedAlternatives,
      reasoning: {
        sensorContribution,
        temporalContribution,
        personalContribution,
        crossValidation
      }
    };
  }

  /**
   * Apply personal preference bias to vibe probabilities
   */
  private applyPersonalBias(
    probs: Record<Vibe, number>,
    prefs: Partial<Record<Vibe, number>>
  ): Record<Vibe, number> {
    const biased: Record<Vibe, number> = { ...probs };

    Object.entries(prefs).forEach(([vibe, bias]) => {
      if (bias === undefined) return;
      // bias ∈ [-0.3, +0.3] from UserLearningSystem
      const multiplier = 1 + bias;               // 0.7 → 1.3
      biased[vibe as Vibe] *= multiplier;
    });

    // re-normalise so total = 1
    const total = Object.values(biased).reduce((s, p) => s + p, 0) || 1;
    Object.keys(biased).forEach(v => (biased[v as Vibe] /= total));

    return biased;
  }

  /**
   * Convert raw scores to normalized probabilities
   */
  private normalizeToProbabilities(vibeScores: Record<Vibe, number>): Record<Vibe, number> {
    const scores = Object.values(vibeScores);
    const total = scores.reduce((sum, score) => sum + Math.max(0, score), 0);
    
    if (total === 0) {
      // If no positive scores, return uniform distribution
      const uniformProb = 1 / Object.keys(vibeScores).length;
      const result: Record<Vibe, number> = {} as any;
      Object.keys(vibeScores).forEach(vibe => {
        result[vibe as Vibe] = uniformProb;
      });
      return result;
    }
    
    const probabilities: Record<Vibe, number> = {} as any;
    Object.entries(vibeScores).forEach(([vibe, score]) => {
      probabilities[vibe as Vibe] = Math.max(0, score) / total;
    });
    
    return probabilities;
  }

  /**
   * Calculate sensor-based confidence contribution
   */
  private calculateSensorContribution(quality: SensorQuality): number {
    // Weighted average of sensor qualities
    const weights = {
      audio: 0.4,
      motion: 0.3,
      light: 0.2,
      location: 0.1
    };
    
    const weightedQuality = 
      quality.audio * weights.audio +
      quality.motion * weights.motion +
      quality.light * weights.light +
      quality.location * weights.location;
    
    // Apply non-linear transformation to emphasize high-quality readings
    return Math.pow(weightedQuality, 1.5);
  }

  /**
   * Calculate temporal context confidence boost
   */
  private calculateTemporalContribution(
    temporalFactors: TemporalFactors,
    probabilities: Record<Vibe, number>
  ): number {
    // Higher temporal relevance increases confidence when it aligns with predictions
    const temporalWeight = temporalFactors.relevance;
    
    // Check alignment between temporal boosts and current probabilities
    let alignment = 0;
    let totalBoosts = 0;
    
    Object.entries(temporalFactors.vibeBoosts).forEach(([vibe, boost]) => {
      if (boost && Math.abs(boost) > 0.1) {
        const probability = probabilities[vibe as Vibe] || 0;
        alignment += boost * probability;
        totalBoosts += Math.abs(boost);
      }
    });
    
    if (totalBoosts === 0) return temporalWeight * 0.5; // Neutral contribution
    
    // Normalize alignment and apply temporal weight
    const normalizedAlignment = Math.max(0, alignment / totalBoosts);
    return temporalWeight * normalizedAlignment;
  }

  /**
   * Calculate personal pattern confidence contribution
   */
  private calculatePersonalContribution(personalFactors: any): number {
    if (!personalFactors || personalFactors.relevance === 0) {
      return 0.3; // Neutral contribution when no personal data
    }
    
    // Higher personal relevance and accuracy increases confidence
    const accuracy = personalFactors.accuracy || 0.5;
    const relevance = personalFactors.relevance || 0;
    
    return relevance * accuracy;
  }

  /**
   * Calculate cross-validation confidence
   */
  private calculateCrossValidation(
    probabilities: Record<Vibe, number>,
    sensorQuality: SensorQuality,
    temporalFactors: TemporalFactors
  ): number {
    // Measure how well different factors agree
    const sortedProbs = Object.values(probabilities).sort((a, b) => b - a);
    const topProb = sortedProbs[0];
    const secondProb = sortedProbs[1] || 0;
    
    // Clear winner indicates good cross-validation
    const separation = topProb - secondProb;
    
    // Higher sensor quality increases confidence in separation
    const qualityBoost = sensorQuality.overall;
    
    // Strong temporal context can increase confidence
    const temporalBoost = temporalFactors.relevance > 0.7 ? 0.1 : 0;
    
    return Math.min(1, separation * qualityBoost + temporalBoost);
  }

  /**
   * Combine all confidence factors using weighted approach
   */
  private combineConfidenceFactors(factors: {
    sensorContribution: number;
    temporalContribution: number;
    personalContribution: number;
    crossValidation: number;
  }): number {
    const weights = {
      sensor: 0.4,
      temporal: 0.2,
      personal: 0.2,
      crossValidation: 0.2
    };
    
    const combined = 
      factors.sensorContribution * weights.sensor +
      factors.temporalContribution * weights.temporal +
      factors.personalContribution * weights.personal +
      factors.crossValidation * weights.crossValidation;
    
    // Apply sigmoid function to create more intuitive confidence ranges
    return this.applySigmoidTransform(combined);
  }

  /**
   * Apply sigmoid transformation for better confidence distribution
   */
  private applySigmoidTransform(x: number): number {
    // Sigmoid function that maps 0-1 input to 0-1 output with better distribution
    const k = 8; // Steepness factor
    const offset = 0.5; // Center point
    
    return 1 / (1 + Math.exp(-k * (x - offset)));
  }

  /**
   * Sort vibes by probability
   */
  private sortVibesByProbability(probabilities: Record<Vibe, number>): Array<{ vibe: Vibe; confidence: number }> {
    return Object.entries(probabilities)
      .map(([vibe, prob]) => ({ vibe: vibe as Vibe, confidence: prob }))
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Adjust alternative confidences based on primary confidence
   */
  private adjustAlternativeConfidences(
    alternatives: Array<{ vibe: Vibe; confidence: number }>,
    primaryConfidence: number
  ): Array<{ vibe: Vibe; confidence: number }> {
    // Scale alternative confidences based on primary confidence
    const scaleFactor = 1 - primaryConfidence;
    
    return alternatives.map(alt => ({
      vibe: alt.vibe,
      confidence: Math.round((alt.confidence * scaleFactor) * 100) / 100
    }));
  }
}