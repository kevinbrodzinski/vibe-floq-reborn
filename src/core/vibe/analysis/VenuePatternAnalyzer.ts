import type { VibeCorrection } from '@/core/vibe/storage/CorrectionStore';
import type { Vibe } from '@/lib/vibes';
import type { VibeDist } from '@/types/personality';
import { VIBE_ENERGY } from '@/core/vibe/vector';
import { getHour, getDow, getVenueType, isSome } from '@/core/vibe/analysis/ctx';

export type VenueImpact = {
  venueType: string;
  energyDelta: number; // -1 to +1, how much this venue affects energy
  preferredVibes: VibeDist; // which vibes user prefers here
  optimalDwellMinutes: number; // sweet spot for time spent
  confidence: number; // 0-1, based on sample size
  sampleSize: number;
};

export type VenueSequence = {
  fromVenue: string;
  toVenue: string;
  resultingVibe: Vibe;
  probability: number; // 0-1
  avgTimeBetween: number; // minutes
  confidence: number;
};

export type VenueRecommendation = {
  venueType: string;
  reason: string;
  confidence: number;
  optimalTime?: { start: number; end: number }; // hour of day
  expectedImpact: string;
};

export class VenuePatternAnalyzer {
  /**
   * Analyze how different venue types impact user's energy and vibe preferences
   */
  analyzeVenueImpact(corrections: VibeCorrection[]): VenueImpact[] {
    const venueData = new Map<string, {
      energyChanges: number[];
      vibeSelections: VibeDist;
      dwellTimes: number[];
      corrections: VibeCorrection[];
    }>();

    // Group corrections by venue type
    corrections.forEach(correction => {
      const venueType = getVenueType(correction);
      if (venueType === 'unknown') return;

      if (!venueData.has(venueType)) {
        venueData.set(venueType, {
          energyChanges: [],
          vibeSelections: {},
          dwellTimes: [],
          corrections: []
        });
      }

      const data = venueData.get(venueType)!;
      data.corrections.push(correction);
      data.vibeSelections[correction.corrected] = (data.vibeSelections[correction.corrected] || 0) + 1;
      
      // Calculate energy change (predicted vs corrected)
      const predictedEnergy = VIBE_ENERGY[correction.predicted];
      const correctedEnergy = VIBE_ENERGY[correction.corrected];
      data.energyChanges.push(correctedEnergy - predictedEnergy);
    });

    // Convert to VenueImpact objects with safe math
    return Array.from(venueData.entries()).map(([venueType, data]) => {
      const sampleSize = data.corrections.length;
      const confidence = Math.min(1, sampleSize / 10); // confidence grows to 1 with 10+ samples
      
      const avgEnergyDelta = data.energyChanges.reduce((sum, delta) => sum + delta, 0) / sampleSize;
      const totalSelections = Object.values(data.vibeSelections).reduce((sum, count) => sum + (count || 0), 0);
      
      // Normalize vibe preferences with safe division
      const preferredVibes: VibeDist = {};
      if (totalSelections > 0) {
        Object.entries(data.vibeSelections).forEach(([vibe, count]) => {
          if (count && count > 0) {
            preferredVibes[vibe as Vibe] = count / totalSelections;
          }
        });
      }

      return {
        venueType,
        energyDelta: Math.max(-1, Math.min(1, avgEnergyDelta)),
        preferredVibes,
        optimalDwellMinutes: this.calculateOptimalDwell(data.corrections),
        confidence,
        sampleSize
      };
    }).filter(impact => impact.confidence > 0.2); // Only include venues with reasonable confidence
  }

  /**
   * Detect venue transition sequences and their outcomes
   */
  detectVenueSequences(corrections: VibeCorrection[]): VenueSequence[] {
    const sequences = new Map<string, {
      outcomes: Vibe[];
      timeBetween: number[];
    }>();

    // Sort corrections by time
    const sortedCorrections = [...corrections].sort((a, b) => a.timestamp - b.timestamp);

    for (let i = 1; i < sortedCorrections.length; i++) {
      const prev = sortedCorrections[i - 1];
      const curr = sortedCorrections[i];
      
      const prevVenue = prev.context.venue;
      const currVenue = curr.context.venue;
      
      if (!prevVenue || !currVenue || prevVenue === currVenue) continue;
      
      const timeBetween = (curr.timestamp - prev.timestamp) / (1000 * 60); // minutes
      if (timeBetween > 480) continue; // Skip if more than 8 hours apart
      
      const key = `${prevVenue} → ${currVenue}`;
      if (!sequences.has(key)) {
        sequences.set(key, { outcomes: [], timeBetween: [] });
      }
      
      sequences.get(key)!.outcomes.push(curr.corrected);
      sequences.get(key)!.timeBetween.push(timeBetween);
    }

    // Convert to VenueSequence objects
    return Array.from(sequences.entries()).map(([key, data]) => {
      const [fromVenue, toVenue] = key.split(' → ');
      const sampleSize = data.outcomes.length;
      
      if (sampleSize < 3) return null; // Need at least 3 samples
      
      // Find most common resulting vibe
      const vibeCounts = data.outcomes.reduce((acc, vibe) => {
        acc[vibe] = (acc[vibe] || 0) + 1;
        return acc;
      }, {} as Record<Vibe, number>);
      
      const mostCommonVibe = Object.entries(vibeCounts)
        .sort(([,a], [,b]) => b - a)[0][0] as Vibe;
      
      const probability = vibeCounts[mostCommonVibe] / sampleSize;
      const avgTimeBetween = data.timeBetween.reduce((sum, time) => sum + time, 0) / sampleSize;
      
      return {
        fromVenue,
        toVenue,
        resultingVibe: mostCommonVibe,
        probability,
        avgTimeBetween,
        confidence: Math.min(1, sampleSize / 8) // confidence grows to 1 with 8+ samples
      };
    }).filter(Boolean) as VenueSequence[];
  }

  /**
   * Get optimal venues for a target vibe at current time
   */
  getOptimalVenues(
    impacts: VenueImpact[], 
    targetVibe: Vibe, 
    currentHour: number
    ): VenueRecommendation[] {
    return impacts
      .filter(impact => impact.confidence > 0.3)
      .map((impact): VenueRecommendation | null => {
        const vibePreference = impact.preferredVibes[targetVibe] || 0;
        const energyAlignment = this.getEnergyAlignment(targetVibe, impact.energyDelta);
        
        const score = (vibePreference * 0.6) + (energyAlignment * 0.4);
        
        if (score < 0.3) return null;
        
        return {
          venueType: impact.venueType,
          reason: this.generateRecommendationReason(impact, targetVibe, score),
          confidence: score * impact.confidence,
          expectedImpact: impact.energyDelta > 0.1 ? 'energizing' : 
                         impact.energyDelta < -0.1 ? 'calming' : 'neutral'
        };
      })
      .filter(isSome)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);
  }

  private calculateVibeEnergy(vibe: Vibe): number {
    return VIBE_ENERGY[vibe] || 0.5;
  }

  private calculateOptimalDwell(corrections: VibeCorrection[]): number {
    // For now, return a reasonable default
    // Could be enhanced to analyze actual dwell patterns from corrections
    return 45; // 45 minutes average
  }

  private getEnergyAlignment(targetVibe: Vibe, venueEnergyDelta: number): number {
    const vibeEnergy = VIBE_ENERGY[targetVibe];
    const energyDistance = Math.abs(vibeEnergy - (0.5 + venueEnergyDelta));
    return Math.max(0, 1 - energyDistance * 2); // Closer energy = higher alignment
  }

  private generateRecommendationReason(
    impact: VenueImpact, 
    targetVibe: Vibe, 
    score: number
  ): string {
    const preference = Math.round((impact.preferredVibes[targetVibe] || 0) * 100);
    
    if (impact.energyDelta > 0.2) {
      return `Energizing venue - you choose "${targetVibe}" here ${preference}% of the time`;
    } else if (impact.energyDelta < -0.2) {
      return `Calming venue - you choose "${targetVibe}" here ${preference}% of the time`;
    } else {
      return `Neutral venue - you choose "${targetVibe}" here ${preference}% of the time`;
    }
  }
}