import type { Vibe } from '@/lib/vibes';
import type { PersonalityInsights, VibeDist } from '@/types/personality';
import type { EngineInputs } from '@/core/vibe/types';
import { VIBE_ENERGY } from '@/core/vibe/vector';

export type VibePrediction = {
  vibe: Vibe;
  confidence: number;
  timeSlot: string; // "morning", "afternoon", "evening", "night"
  reasoning: string[];
  contextualFactors: string[];
};

export type PredictiveContext = {
  hour: number;
  dayOfWeek: number;
  isWeekend: boolean;
  expectedVenueType?: string;
  weatherCondition?: string;
};

export class PredictiveVibeEngine {
  constructor(private insights: PersonalityInsights) {}

  /**
   * Predict likely vibes for upcoming time periods
   */
  predictUpcomingVibes(context: PredictiveContext): VibePrediction[] {
    if (!this.insights.hasEnoughData) {
      return [];
    }

    const predictions: VibePrediction[] = [];
    const currentHour = context.hour;

    // Predict for next 4 time slots (4-6 hour windows)
    const timeSlots = [
      { name: 'soon', hours: [currentHour + 1, currentHour + 2] },
      { name: 'later', hours: [currentHour + 3, currentHour + 4] },
      { name: 'evening', hours: [18, 19, 20] },
      { name: 'tonight', hours: [21, 22, 23] }
    ];

    for (const slot of timeSlots) {
      const prediction = this.predictForTimeSlot(slot, context);
      if (prediction) {
        predictions.push(prediction);
      }
    }

    return predictions.slice(0, 3); // Return top 3 predictions
  }

  private predictForTimeSlot(
    slot: { name: string; hours: number[] }, 
    context: PredictiveContext
  ): VibePrediction | null {
    const { temporalPrefs, chronotype, energyType, socialType } = this.insights;
    
    if (!temporalPrefs) return null;

    // Aggregate preferences for this time slot
    const slotPrefs: VibeDist = {};
    let totalWeight = 0;

    for (const hour of slot.hours) {
      const hourPrefs = temporalPrefs[hour % 24];
      if (hourPrefs) {
        const weight = this.getHourWeight(hour, chronotype);
        totalWeight += weight;
        
        for (const [vibe, pref] of Object.entries(hourPrefs)) {
          if (pref) {
            slotPrefs[vibe as Vibe] = (slotPrefs[vibe as Vibe] || 0) + (pref * weight);
          }
        }
      }
    }

    if (totalWeight === 0) return null;

    // Normalize preferences
    for (const vibe in slotPrefs) {
      slotPrefs[vibe as Vibe] = (slotPrefs[vibe as Vibe] || 0) / totalWeight;
    }

    // Find top vibe with contextual adjustments
    const adjustedPrefs = this.applyContextualAdjustments(slotPrefs, context, slot.name);
    const topVibe = this.getTopVibe(adjustedPrefs);
    
    if (!topVibe.vibe || topVibe.confidence < 0.3) return null;

    const reasoning = this.generateReasoning(topVibe.vibe, slot.name, context);
    const contextualFactors = this.getContextualFactors(context, slot.name);

    return {
      vibe: topVibe.vibe,
      confidence: topVibe.confidence,
      timeSlot: slot.name,
      reasoning,
      contextualFactors
    };
  }

  private getHourWeight(hour: number, chronotype: string): number {
    // Weight hours based on chronotype alignment
    if (chronotype === 'lark') {
      if (hour >= 6 && hour <= 11) return 1.2; // Morning boost
      if (hour >= 22) return 0.7; // Late night penalty
    } else if (chronotype === 'owl') {
      if (hour >= 18 && hour <= 23) return 1.2; // Evening boost
      if (hour >= 6 && hour <= 9) return 0.7; // Early morning penalty
    }
    return 1.0;
  }

  private applyContextualAdjustments(
    prefs: VibeDist, 
    context: PredictiveContext, 
    timeSlot: string
  ): VibeDist {
    const adjusted = { ...prefs };
    
    // Weekend vs weekday adjustments
    if (context.isWeekend) {
      // Boost social/relaxed vibes on weekends
      if (adjusted.social) adjusted.social *= 1.1;
      if (adjusted.chill) adjusted.chill *= 1.1;
      if (adjusted.flowing) adjusted.flowing *= 1.05;
    } else {
      // Boost focused/energetic vibes on weekdays
      if (adjusted.focused) adjusted.focused *= 1.1;
      if (adjusted.energetic) adjusted.energetic *= 1.05;
    }

    // Venue type influence
    if (context.expectedVenueType) {
      const venueBoosts = this.getVenueVibeBoosts(context.expectedVenueType);
      for (const [vibe, boost] of Object.entries(venueBoosts)) {
        if (adjusted[vibe as Vibe]) {
          adjusted[vibe as Vibe] = (adjusted[vibe as Vibe] || 0) * boost;
        }
      }
    }

    // Energy type influence based on time
    if (this.insights.energyType === 'high-energy' && timeSlot === 'soon') {
      // Boost high-energy vibes for immediate predictions
      for (const [vibe, energy] of Object.entries(VIBE_ENERGY)) {
        if (energy > 0.7 && adjusted[vibe as Vibe]) {
          adjusted[vibe as Vibe] = (adjusted[vibe as Vibe] || 0) * 1.1;
        }
      }
    }

    return adjusted;
  }

  private getVenueVibeBoosts(venueType: string): Record<string, number> {
    const boosts: Record<string, Record<string, number>> = {
      gym: { energetic: 1.3, focused: 1.2, hype: 1.1 },
      coffee: { focused: 1.2, curious: 1.1, social: 1.1 },
      bar: { social: 1.3, flowing: 1.2, open: 1.1 },
      restaurant: { social: 1.2, romantic: 1.1, flowing: 1.1 },
      park: { chill: 1.2, flowing: 1.1, open: 1.1 },
      office: { focused: 1.3, energetic: 1.1 }
    };
    return boosts[venueType] || {};
  }

  private getTopVibe(prefs: VibeDist): { vibe: Vibe | null; confidence: number } {
    let maxPref = 0;
    let topVibe: Vibe | null = null;

    for (const [vibe, pref] of Object.entries(prefs)) {
      if (pref && pref > maxPref) {
        maxPref = pref;
        topVibe = vibe as Vibe;
      }
    }

    return { vibe: topVibe, confidence: maxPref };
  }

  private generateReasoning(vibe: Vibe, timeSlot: string, context: PredictiveContext): string[] {
    const reasoning: string[] = [];
    
    // Chronotype reasoning
    if (this.insights.chronotype === 'lark' && timeSlot === 'soon' && context.hour < 12) {
      reasoning.push(`Your morning chronotype suggests ${vibe} energy`);
    } else if (this.insights.chronotype === 'owl' && timeSlot === 'evening' && context.hour > 17) {
      reasoning.push(`Your evening chronotype aligns with ${vibe} vibes`);
    }

    // Historical pattern reasoning
    reasoning.push(`Based on ${this.insights.correctionCount} past patterns`);

    // Energy type reasoning
    if (this.insights.energyType === 'high-energy' && VIBE_ENERGY[vibe] > 0.7) {
      reasoning.push('Matches your high-energy profile');
    }

    // Social type reasoning
    if (this.insights.socialType === 'social' && ['social', 'open', 'flowing'].includes(vibe)) {
      reasoning.push('Aligns with your social tendencies');
    }

    return reasoning.slice(0, 2); // Keep it concise
  }

  private getContextualFactors(context: PredictiveContext, timeSlot: string): string[] {
    const factors: string[] = [];
    
    if (context.isWeekend) {
      factors.push('Weekend flexibility');
    } else {
      factors.push('Weekday structure');
    }

    if (context.expectedVenueType) {
      factors.push(`Expected ${context.expectedVenueType} context`);
    }

    if (timeSlot === 'evening') {
      factors.push('Evening wind-down time');
    } else if (timeSlot === 'soon') {
      factors.push('Immediate context');
    }

    return factors;
  }

  /**
   * Get confidence in prediction accuracy
   */
  getPredictionConfidence(): number {
    const baseConfidence = this.insights.confidence;
    const dataQuality = this.insights.dataQuality === 'high' ? 1.0 : 
                       this.insights.dataQuality === 'medium' ? 0.8 : 0.6;
    
    return Math.min(0.95, baseConfidence * dataQuality);
  }
}