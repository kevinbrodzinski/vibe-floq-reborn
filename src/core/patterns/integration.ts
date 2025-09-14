// Engine integration for pattern-based enrichment (separate from engine-integration.ts)
import type { Vibe } from '@/lib/vibes';
import type { EngineInputs, VibeVector } from '@/core/vibe/types';
import { getCachedTemporalPrefs } from './service';
import { VIBES } from '@/lib/vibes';

// Telemetry counters
let patternApplyMs = 0;
let patternReadCount = 0;
let patternNudgeCount = 0;

export function bumpNudge() { patternNudgeCount++; }

export function getPatternTelemetry() {
  return {
    averageApplyMs:
      patternReadCount > 0 ? (patternApplyMs / patternReadCount).toFixed(2) : '0',
    totalReads: patternReadCount,
    nudgesApplied: patternNudgeCount,
    enabled: import.meta.env.VITE_VIBE_PATTERNS !== 'off'
  };
}

// Apply temporal pattern nudges to vibe vector (called from VibeEngine.evaluate)
export async function applyTemporalNudges(
  inputs: EngineInputs,
  vector: VibeVector,
  confidence: number
): Promise<{
  vector: VibeVector;
  confidence: number;
  applied: boolean;
}> {
  if (import.meta.env.VITE_VIBE_PATTERNS === 'off' || !inputs.patterns?.hasEnoughData) {
    return { vector, confidence, applied: false };
  }

  try {
    // Use temporal preferences from inputs.patterns.temporalPrefs if available
    const hourPrefs = inputs.patterns.temporalPrefs?.[inputs.hour];
    
    if (!hourPrefs || Object.keys(hourPrefs).length === 0) {
      return { vector, confidence, applied: false };
    }

    // Find most preferred vibe for this hour
    const sortedPrefs = Object.entries(hourPrefs)
      .sort(([,a], [,b]) => (b ?? 0) - (a ?? 0));

    const [preferredVibe, preferredWeight] = sortedPrefs[0];

    // Only apply if preference is strong enough (>35%)
    if ((preferredWeight ?? 0) < 0.35) {
      return { vector, confidence, applied: false };
    }

    const currentBest = VIBES.reduce((a, b) => 
      vector[b] > vector[a] ? b : a
    );

    // Only nudge if preferred vibe is competitive with current best (>70% of best)
    if (vector[preferredVibe as Vibe] < (vector[currentBest] * 0.7)) {
      return { vector, confidence, applied: false };
    }

    // Apply bounded nudge (+3% max)
    const adjustedVector = { ...vector };
    const boost = Math.min(0.03, (preferredWeight ?? 0) * 0.1);
    adjustedVector[preferredVibe as Vibe] += boost;

    // Renormalize vector to maintain probability distribution
    const sum = Object.values(adjustedVector).reduce((a, b) => a + b, 0);
    Object.keys(adjustedVector).forEach(vibe => {
      adjustedVector[vibe as Vibe] /= sum;
    });

    const adjustedConfidence = Math.min(0.95, confidence + 0.01);

    return {
      vector: adjustedVector,
      confidence: adjustedConfidence,
      applied: true
    };

  } catch (error) {
    console.warn('[Patterns] Temporal nudge failed:', error);
    return { vector, confidence, applied: false };
  }
}