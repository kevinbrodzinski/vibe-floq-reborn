import type { ComponentScores, Vibe } from "../types";
import type { CorrectionPattern } from "../storage/CorrectionStore";
import { VIBES } from "@/lib/vibes";

export interface PersonalizedWeights {
  // Component weights per vibe (overrides from MasterEquation)
  weights: Record<keyof ComponentScores, Partial<Record<Vibe, number>>>;
  confidence: number; // How confident we are in these weights (0-1)
  lastUpdated: number;
  correctionCount: number;
}

class PersonalWeightsImpl {
  private readonly STORAGE_KEY = 'personal_weights_v1';
  private readonly LEARNING_RATE = 0.05; // Conservative learning rate
  private readonly MIN_CORRECTIONS = 10; // Minimum corrections before personalizing

  load(): PersonalizedWeights | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return null;
      
      const parsed = JSON.parse(stored);
      return this.validateWeights(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  save(weights: PersonalizedWeights): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(weights));
    } catch (error) {
      console.warn('[PersonalWeights] Failed to save weights:', error);
    }
  }

  /**
   * Learn from correction patterns using gradient descent
   */
  learn(patterns: CorrectionPattern[]): PersonalizedWeights {
    const current = this.load() || this.getDefaultWeights();
    
    if (patterns.length === 0) return current;

    // Don't start personalizing until we have enough data
    if (current.correctionCount < this.MIN_CORRECTIONS) {
      return {
        ...current,
        correctionCount: Math.min(current.correctionCount + patterns.length, this.MIN_CORRECTIONS)
      };
    }

    const newWeights = { ...current };

    // Apply pattern-based adjustments
    patterns.forEach(pattern => {
      const { component, vibe, adjustmentDirection, strength, confidence } = pattern;
      
      if (!newWeights.weights[component]) {
        newWeights.weights[component] = {};
      }
      
      const currentWeight = newWeights.weights[component]![vibe] || 0;
      const adjustment = adjustmentDirection * strength * confidence * this.LEARNING_RATE;
      
      // Update weight with bounds checking
      newWeights.weights[component]![vibe] = Math.max(-1, Math.min(1, currentWeight + adjustment));
    });

    // Update metadata
    newWeights.confidence = Math.min(0.9, current.confidence + patterns.length * 0.01);
    newWeights.lastUpdated = Date.now();
    newWeights.correctionCount += patterns.length;

    // Normalize weights to prevent drift
    this.normalizeWeights(newWeights);

    this.save(newWeights);
    return newWeights;
  }

  /**
   * Apply personal weights to base component influence
   */
  applyPersonalWeights(
    baseWeights: Record<keyof ComponentScores, Partial<Record<Vibe, number>>>,
    personalWeights: PersonalizedWeights | null
  ): Record<keyof ComponentScores, Partial<Record<Vibe, number>>> {
    if (!personalWeights || personalWeights.confidence < 0.3) {
      return baseWeights;
    }

    const blendFactor = Math.min(personalWeights.confidence, 0.7); // Max 70% personalization
    const result = { ...baseWeights };

    Object.entries(personalWeights.weights).forEach(([component, vibeWeights]) => {
      const comp = component as keyof ComponentScores;
      if (!result[comp]) result[comp] = {};

      Object.entries(vibeWeights || {}).forEach(([vibe, personalWeight]) => {
        const baseWeight = result[comp]![vibe as Vibe] || 0;
        const adjustedWeight = baseWeight + (personalWeight! * blendFactor);
        
        result[comp]![vibe as Vibe] = Math.max(-1, Math.min(1, adjustedWeight));
      });
    });

    return result;
  }

  private getDefaultWeights(): PersonalizedWeights {
    return {
      weights: {
        circadian: {},
        movement: {},
        venueEnergy: {},
        deviceUsage: {},
        weather: {}
      },
      confidence: 0,
      lastUpdated: Date.now(),
      correctionCount: 0
    };
  }

  private validateWeights(weights: any): weights is PersonalizedWeights {
    return (
      weights &&
      typeof weights.confidence === 'number' &&
      typeof weights.lastUpdated === 'number' &&
      typeof weights.correctionCount === 'number' &&
      weights.weights &&
      typeof weights.weights === 'object'
    );
  }

  private normalizeWeights(weights: PersonalizedWeights): void {
    // Prevent any single weight from becoming too extreme
    Object.values(weights.weights).forEach(vibeWeights => {
      Object.keys(vibeWeights || {}).forEach(vibe => {
        const current = vibeWeights![vibe as Vibe]!;
        vibeWeights![vibe as Vibe] = Math.max(-0.8, Math.min(0.8, current));
      });
    });
  }

  getStats(): { confidence: number; correctionCount: number; lastUpdated: number | null } {
    const weights = this.load();
    return {
      confidence: weights?.confidence || 0,
      correctionCount: weights?.correctionCount || 0,
      lastUpdated: weights?.lastUpdated || null
    };
  }

  reset(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}

export const PersonalWeights = new PersonalWeightsImpl();