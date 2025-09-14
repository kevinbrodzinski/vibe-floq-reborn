import type { VibeCorrection } from '@/core/vibe/storage/CorrectionStore';
import type { Vibe } from '@/lib/vibes';

export type BehaviorSequence = {
  sequence: Vibe[];
  nextVibeProbs: Record<Vibe, number>;
  confidence: number;
  sampleSize: number;
  avgDuration: number; // minutes between steps
};

export type TriggerPattern = {
  trigger: {
    type: 'weather' | 'temporal' | 'venue' | 'social';
    condition: string;
  };
  resultingVibe: Vibe;
  probability: number;
  confidence: number;
  strength: 'weak' | 'moderate' | 'strong';
};

export type PredictiveInsight = {
  currentState: Vibe;
  predictions: Array<{
    nextVibe: Vibe;
    probability: number;
    reasoning: string;
    confidence: number;
  }>;
  contextFactors: string[];
};

export class SequenceDetector {
  private readonly MIN_SEQUENCE_LENGTH = 2;
  private readonly MAX_SEQUENCE_LENGTH = 4;
  private readonly MIN_SAMPLES_FOR_PATTERN = 3;

  /**
   * Detect common vibe sequences and their transition probabilities
   */
  detectSequences(corrections: VibeCorrection[]): BehaviorSequence[] {
    if (corrections.length < this.MIN_SAMPLES_FOR_PATTERN * 2) return [];

    const sortedCorrections = [...corrections].sort((a, b) => a.timestamp - b.timestamp);
    const sequences = new Map<string, {
      transitions: Vibe[];
      durations: number[];
    }>();

    // Extract sequences of different lengths
    for (let length = this.MIN_SEQUENCE_LENGTH; length <= this.MAX_SEQUENCE_LENGTH; length++) {
      for (let i = 0; i <= sortedCorrections.length - length - 1; i++) {
        const sequence = sortedCorrections.slice(i, i + length);
        const nextCorrection = sortedCorrections[i + length];
        
        if (!nextCorrection) continue;
        
        // Check if sequence is temporally valid (within reasonable time window)
        const totalDuration = nextCorrection.timestamp - sequence[0].timestamp;
        if (totalDuration > 8 * 60 * 60 * 1000) continue; // Max 8 hours
        
        const sequenceKey = sequence.map(c => c.corrected).join(' → ');
        
        if (!sequences.has(sequenceKey)) {
          sequences.set(sequenceKey, { transitions: [], durations: [] });
        }
        
        sequences.get(sequenceKey)!.transitions.push(nextCorrection.corrected);
        sequences.get(sequenceKey)!.durations.push(totalDuration / (1000 * 60)); // minutes
      }
    }

    // Convert to BehaviorSequence objects
    return Array.from(sequences.entries())
      .map(([sequenceKey, data]) => {
        const sequence = sequenceKey.split(' → ') as Vibe[];
        const sampleSize = data.transitions.length;
        
        if (sampleSize < this.MIN_SAMPLES_FOR_PATTERN) return null;
        
        // Calculate next vibe probabilities
        const nextVibeProbs = this.calculateTransitionProbabilities(data.transitions);
        const avgDuration = data.durations.reduce((sum, d) => sum + d, 0) / sampleSize;
        const confidence = Math.min(1, sampleSize / 8); // Confidence grows with more samples
        
        return {
          sequence,
          nextVibeProbs,
          confidence,
          sampleSize,
          avgDuration
        };
      })
      .filter(Boolean)
      .sort((a, b) => b!.confidence - a!.confidence) as BehaviorSequence[];
  }

  /**
   * Identify environmental and contextual triggers that lead to specific vibes
   */
  detectTriggers(corrections: VibeCorrection[]): TriggerPattern[] {
    const triggers: TriggerPattern[] = [];

    // Temporal triggers (day of week, time of day)
    triggers.push(...this.detectTemporalTriggers(corrections));
    
    // Venue triggers
    triggers.push(...this.detectVenueTriggers(corrections));
    
    // Social context triggers (could be enhanced with social data)
    triggers.push(...this.detectSocialTriggers(corrections));

    return triggers
      .filter(trigger => trigger.confidence > 0.3)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10); // Top 10 most confident triggers
  }

  /**
   * Generate predictions for next likely vibe based on current state and patterns
   */
  predictNextVibe(
    currentVibe: Vibe,
    sequences: BehaviorSequence[],
    currentContext: {
      hour: number;
      isWeekend: boolean;
      venueType?: string;
    }
  ): PredictiveInsight {
    const predictions: PredictiveInsight['predictions'] = [];
    const contextFactors: string[] = [];

    // Find sequences that match current vibe
    const relevantSequences = sequences.filter(seq => 
      seq.sequence[seq.sequence.length - 1] === currentVibe && seq.confidence > 0.4
    );

    if (relevantSequences.length === 0) {
      return {
        currentState: currentVibe,
        predictions: [],
        contextFactors: ['Insufficient pattern data for predictions']
      };
    }

    // Aggregate predictions from all relevant sequences
    const vibeProbs = new Map<Vibe, { prob: number; reasoning: string[]; confidence: number }>();

    relevantSequences.forEach(seq => {
      Object.entries(seq.nextVibeProbs).forEach(([vibe, prob]) => {
        if (prob < 0.1) return; // Skip low probability transitions
        
        const existing = vibeProbs.get(vibe as Vibe) || { prob: 0, reasoning: [], confidence: 0 };
        existing.prob += prob * seq.confidence;
        existing.reasoning.push(`${seq.sequence.join(' → ')} pattern (${Math.round(prob * 100)}%)`);
        existing.confidence = Math.max(existing.confidence, seq.confidence);
        vibeProbs.set(vibe as Vibe, existing);
      });
    });

    // Convert to predictions array
    vibeProbs.forEach((data, vibe) => {
      predictions.push({
        nextVibe: vibe,
        probability: Math.min(1, data.prob), // Normalize
        reasoning: data.reasoning[0], // Use most confident reasoning
        confidence: data.confidence
      });
    });

    // Sort by probability
    predictions.sort((a, b) => b.probability - a.probability);

    // Add context factors
    if (currentContext.venueType) {
      contextFactors.push(`At ${currentContext.venueType}`);
    }
    
    const timeOfDay = currentContext.hour < 12 ? 'morning' : 
                     currentContext.hour < 17 ? 'afternoon' : 'evening';
    contextFactors.push(`${timeOfDay} on ${currentContext.isWeekend ? 'weekend' : 'weekday'}`);

    return {
      currentState: currentVibe,
      predictions: predictions.slice(0, 3), // Top 3 predictions
      contextFactors
    };
  }

  private calculateTransitionProbabilities(transitions: Vibe[]): Record<Vibe, number> {
    const counts = transitions.reduce((acc, vibe) => {
      acc[vibe] = (acc[vibe] || 0) + 1;
      return acc;
    }, {} as Record<Vibe, number>);

    const total = transitions.length;
    return Object.fromEntries(
      Object.entries(counts).map(([vibe, count]) => [vibe, count / total])
    ) as Record<Vibe, number>;
  }

  private detectTemporalTriggers(corrections: VibeCorrection[]): TriggerPattern[] {
    const triggers: TriggerPattern[] = [];
    
    // Weekend vs weekday patterns
    const weekendCorrections = corrections.filter(c => c.context.dayOfWeek % 6 === 0);
    const weekdayCorrections = corrections.filter(c => c.context.dayOfWeek % 6 !== 0);
    
    if (weekendCorrections.length >= 3 && weekdayCorrections.length >= 3) {
      const weekendVibes = this.getMostCommonVibes(weekendCorrections);
      const weekdayVibes = this.getMostCommonVibes(weekdayCorrections);
      
      // Find vibes that are significantly more common on weekends
      Object.entries(weekendVibes).forEach(([vibe, weekendFreq]) => {
        const weekdayFreq = weekdayVibes[vibe] || 0;
        if (weekendFreq > weekdayFreq + 0.2) { // 20% higher on weekends
          triggers.push({
            trigger: { type: 'temporal', condition: 'weekend' },
            resultingVibe: vibe as Vibe,
            probability: weekendFreq,
            confidence: Math.min(1, weekendCorrections.length / 10),
            strength: weekendFreq > weekdayFreq + 0.4 ? 'strong' : 'moderate'
          });
        }
      });
    }

    return triggers;
  }

  private detectVenueTriggers(corrections: VibeCorrection[]): TriggerPattern[] {
    const triggers: TriggerPattern[] = [];
    const venueVibes = new Map<string, Record<Vibe, number>>();
    
    // Group by venue type
    corrections.forEach(correction => {
      const venueType = correction.context.venue;
      if (!venueType) return;
      
      if (!venueVibes.has(venueType)) {
        venueVibes.set(venueType, {} as Record<Vibe, number>);
      }
      
      const vibes = venueVibes.get(venueType)!;
      vibes[correction.corrected] = (vibes[correction.corrected] || 0) + 1;
    });

    // Find strong venue → vibe associations
    venueVibes.forEach((vibes, venueType) => {
      const total = Object.values(vibes).reduce((sum, count) => sum + count, 0);
      if (total < 3) return; // Need at least 3 samples
      
      Object.entries(vibes).forEach(([vibe, count]) => {
        const probability = count / total;
        if (probability > 0.4) { // Strong association
          triggers.push({
            trigger: { type: 'venue', condition: venueType },
            resultingVibe: vibe as Vibe,
            probability,
            confidence: Math.min(1, total / 8),
            strength: probability > 0.6 ? 'strong' : 'moderate'
          });
        }
      });
    });

    return triggers;
  }

  private detectSocialTriggers(corrections: VibeCorrection[]): TriggerPattern[] {
    // Placeholder for social triggers - could be enhanced with social context data
    return [];
  }

  private getMostCommonVibes(corrections: VibeCorrection[]): Record<Vibe, number> {
    const counts = corrections.reduce((acc, correction) => {
      acc[correction.corrected] = (acc[correction.corrected] || 0) + 1;
      return acc;
    }, {} as Record<Vibe, number>);

    const total = corrections.length;
    return Object.fromEntries(
      Object.entries(counts).map(([vibe, count]) => [vibe, count / total])
    ) as Record<Vibe, number>;
  }
}