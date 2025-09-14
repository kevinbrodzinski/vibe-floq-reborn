// Engine integration for pattern-based context enrichment
import type { Vibe } from '@/lib/vibes';
import type { EngineInputs, VibeVector } from '@/core/vibe/types';
import { getCachedVenueImpacts, getCachedTemporalPrefs } from './service';
import { VIBES } from '@/lib/vibes';

// Feature flag for pattern system
const PATTERNS_ENABLED = import.meta.env.VITE_VIBE_PATTERNS === 'on';

// Performance tracking
let patternApplyMs = 0;
let patternReadCount = 0;

// Apply learned patterns to enrich vibe prediction (bounded, safe)
export async function enrichWithPatterns(
  inputs: EngineInputs,
  vector: VibeVector,
  components: Record<string, number>,
  confidence: number
): Promise<{
  vector: VibeVector;
  components: Record<string, number>;
  confidence: number;
  patternBoosts: string[];
}> {
  if (!PATTERNS_ENABLED || !inputs.patterns?.hasEnoughData) {
    return { vector, components, confidence, patternBoosts: [] };
  }
  
  const startTime = performance.now();
  const patternBoosts: string[] = [];
  
  try {
    let adjustedVector = { ...vector };
    let adjustedComponents = { ...components };
    let adjustedConfidence = confidence;
    
    // Apply temporal preference nudges
    const temporalBoost = await applyTemporalEnrichment(
      inputs.hour,
      adjustedVector,
      adjustedConfidence
    );
    
    if (temporalBoost.applied) {
      adjustedVector = temporalBoost.vector;
      adjustedConfidence = temporalBoost.confidence;
      patternBoosts.push(`temporal:${temporalBoost.preferredVibe}`);
    }
    
    // Apply venue impact enrichment
    const venueBoost = await applyVenueEnrichment(
      inputs,
      adjustedComponents
    );
    
    if (venueBoost.applied) {
      adjustedComponents = venueBoost.components;
      patternBoosts.push(`venue:${inputs.venueType}:${venueBoost.energyDelta.toFixed(2)}`);
    }
    
    patternApplyMs += performance.now() - startTime;
    patternReadCount++;
    
    // Log telemetry in development
    if (import.meta.env.DEV && patternBoosts.length > 0) {
      console.log('[Patterns] Applied enrichments:', {
        boosts: patternBoosts,
        confidenceChange: (adjustedConfidence - confidence).toFixed(3),
        elapsedMs: (performance.now() - startTime).toFixed(1)
      });
    }
    
    return {
      vector: adjustedVector,
      components: adjustedComponents, 
      confidence: Math.min(0.95, adjustedConfidence),
      patternBoosts
    };
    
  } catch (error) {
    console.warn('Pattern enrichment failed:', error);
    return { vector, components, confidence, patternBoosts: [] };
  }
}

// Apply temporal preference patterns (time-of-day nudges)
async function applyTemporalEnrichment(
  hour: number,
  vector: VibeVector,
  confidence: number
): Promise<{
  applied: boolean;
  vector: VibeVector;
  confidence: number;
  preferredVibe?: Vibe;
}> {
  try {
    const temporalStore = await getCachedTemporalPrefs();
    const hourPrefs = temporalStore.data[hour];
    
    if (!hourPrefs || Object.keys(hourPrefs).length === 0) {
      return { applied: false, vector, confidence };
    }
    
    // Find most preferred vibe for this hour
    const sortedPrefs = Object.entries(hourPrefs)
      .sort(([,a], [,b]) => ((b as number) ?? 0) - ((a as number) ?? 0));
    
    const [preferredVibe, preferredWeight] = sortedPrefs[0];
    
    // Only apply if preference is strong enough and doesn't fight current prediction
    if (((preferredWeight as number) ?? 0) < 0.35) {
      return { applied: false, vector, confidence };
    }
    
    const currentBest = VIBES.reduce((a, b) => 
      vector[b] > vector[a] ? b : a
    );
    
    // Only nudge if preferred vibe is competitive with current best
    if (vector[preferredVibe as Vibe] < (vector[currentBest] * 0.7)) {
      return { applied: false, vector, confidence };
    }
    
    // Apply bounded nudge (+3% max)
    const adjustedVector = { ...vector };
    const boost = Math.min(0.03, ((preferredWeight as number) ?? 0) * 0.1);
    adjustedVector[preferredVibe as Vibe] += boost;
    
    // Renormalize vector
    const sum = Object.values(adjustedVector).reduce((a, b) => a + b, 0);
    Object.keys(adjustedVector).forEach(vibe => {
      adjustedVector[vibe as Vibe] /= sum;
    });
    
    const adjustedConfidence = Math.min(0.95, confidence + 0.01);
    
    return {
      applied: true,
      vector: adjustedVector,
      confidence: adjustedConfidence,
      preferredVibe: preferredVibe as Vibe
    };
    
  } catch (error) {
    console.warn('Temporal enrichment failed:', error);
    return { applied: false, vector, confidence };
  }
}

// Apply venue impact patterns (energy component adjustment)
async function applyVenueEnrichment(
  inputs: EngineInputs,
  components: Record<string, number>
): Promise<{
  applied: boolean;
  components: Record<string, number>;
  energyDelta: number;
}> {
  try {
    const venueType = inputs.venueType;
    if (!venueType) {
      return { applied: false, components, energyDelta: 0 };
    }
    
    const venueStore = await getCachedVenueImpacts();
    const impact = venueStore.data[venueType];
    
    if (!impact || impact.sampleN < 3) {
      return { applied: false, components, energyDelta: 0 };
    }
    
    // Apply bounded adjustment to venue energy component
    const adjustedComponents = { ...components };
    const energyAdjustment = Math.max(-0.05, Math.min(0.05, impact.energyDelta * 0.2));
    
    if (adjustedComponents.venueEnergy !== undefined) {
      adjustedComponents.venueEnergy = Math.max(0, Math.min(1, 
        adjustedComponents.venueEnergy + energyAdjustment
      ));
    }
    
    return {
      applied: Math.abs(energyAdjustment) > 0.001,
      components: adjustedComponents,
      energyDelta: impact.energyDelta
    };
    
  } catch (error) {
    console.warn('Venue enrichment failed:', error);
    return { applied: false, components, energyDelta: 0 };
  }
}

// Get pattern performance telemetry
export function getPatternTelemetry() {
  return {
    averageApplyMs: patternReadCount > 0 ? (patternApplyMs / patternReadCount).toFixed(2) : '0',
    totalReads: patternReadCount,
    enabled: PATTERNS_ENABLED
  };
}

// Reset telemetry counters
export function resetPatternTelemetry() {
  patternApplyMs = 0;
  patternReadCount = 0;
}