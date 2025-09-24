// Pattern evolution using EWMA with bounded learning rates and L2 decay
import type { Vibe } from '@/lib/vibes';
import type { VenueImpacts, PersonalityProfile } from './store';

// Learning parameters (tuned for stability)
const LR = 0.08;         // learning rate for updates
export const DECAY = 0.995;     // periodic decay toward neutral  
const PROFILE_LR = 0.05; // slower learning for personality traits

export function ewma(old: number, fresh: number, lr = LR): number {
  return old + lr * (fresh - old);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// Evolve venue impact from new behavioral sample
export function evolveVenueImpact(
  old: VenueImpacts[string] | undefined, 
  delta: {
    energyDelta: number;          // -1..+1 sampled from this session
    preferredVibe?: Vibe;         // the "chosen" vibe at this venue
    dwellMin?: number;            // dwell time at venue
  }
): VenueImpacts[string] {
  const base = old ?? { 
    sampleN: 0, 
    energyDelta: 0, 
    preferredVibes: {}, 
    optimalDwellMin: 45 
  };
  
  const next: typeof base = { 
    ...base, 
    sampleN: base.sampleN + 1 
  };

  // Update energy impact with bounded EWMA
  next.energyDelta = ewma(base.energyDelta, clamp(delta.energyDelta, -1, 1));
  
  // Update preferred vibe distribution
  if (delta.preferredVibe) {
    const pv = { ...base.preferredVibes };
    pv[delta.preferredVibe] = ewma(pv[delta.preferredVibe] ?? 0, 1, LR);
    
    // Renormalize to maintain probability distribution
    const sum = Object.values(pv).reduce((a, b) => a + (b ?? 0), 0) || 1;
    Object.keys(pv).forEach(k => {
      pv[k as Vibe] = Number(((pv[k as Vibe] ?? 0) / sum).toFixed(4));
    });
    next.preferredVibes = pv;
  }
  
  // Update optimal dwell time
  if (typeof delta.dwellMin === 'number' && delta.dwellMin > 0) {
    next.optimalDwellMin = ewma(base.optimalDwellMin, delta.dwellMin);
  }
  
  return next;
}

// Evolve personality profile (slower, more stable updates)
export function evolvePersonalityProfile(
  old: PersonalityProfile,
  delta: {
    energyPref: number;     // -1..+1 from latest analysis window
    socialPref: number;     // -1..+1 from social vs solo behavior
    chronotype: 'lark' | 'owl' | 'balanced';
    consistency01: number;  // 0..1 pattern consistency measure
  }
): PersonalityProfile {
  const next = { ...old };
  
  // Bounded EWMA updates with slower learning rate
  next.energyPreference = ewma(
    old.energyPreference, 
    clamp(delta.energyPref, -1, 1), 
    PROFILE_LR
  );
  
  next.socialPreference = ewma(
    old.socialPreference,
    clamp(delta.socialPref, -1, 1),
    PROFILE_LR
  );
  
  next.consistency01 = ewma(
    old.consistency01,
    clamp(delta.consistency01, 0, 1),
    PROFILE_LR
  );
  
  // Chronotype switches only with strong evidence
  if (next.sampleCount > 20) {
    next.chronotype = delta.chronotype;
  }
  
  next.updatedAt = Date.now();
  next.sampleCount = old.sampleCount + 1;
  
  return next;
}

// Apply L2 decay to prevent overfitting (called periodically)
export function applyL2Decay<V extends Record<string, any>>(
  record: V, 
  factor = DECAY
): V {
  const decayed = { ...record } as V;
  
  Object.keys(decayed).forEach(key => {
    const value = decayed[key];
    if (typeof value === 'number') {
      (decayed as any)[key] = Number((value * factor).toFixed(4));
    } else if (value && typeof value === 'object') {
      // Recursively decay nested numeric values
      (decayed as any)[key] = applyL2Decay(value, factor);
    }
  });
  
  return decayed;
}

// Normalize vibe distribution to sum to 1
export function normalizeVibeDistribution(
  dist: Partial<Record<Vibe, number>>
): Partial<Record<Vibe, number>> {
  const sum = Object.values(dist).reduce((a, b) => a + (b ?? 0), 0);
  if (sum <= 0) return dist;
  
  const normalized: Partial<Record<Vibe, number>> = {};
  Object.entries(dist).forEach(([vibe, value]) => {
    if (typeof value === 'number') {
      normalized[vibe as Vibe] = Number((value / sum).toFixed(4));
    }
  });
  
  return normalized;
}

// Update temporal preferences from user choice
export function updateTemporalPreference(
  hourPrefs: Partial<Record<Vibe, number>>, 
  chosenVibe: Vibe,
  learningRate = LR
): Partial<Record<Vibe, number>> {
  const updated = { ...hourPrefs };
  
  // Boost chosen vibe
  updated[chosenVibe] = ewma(updated[chosenVibe] ?? 0, 1, learningRate);
  
  // Slightly reduce other vibes to maintain distribution balance
  Object.keys(updated).forEach(vibe => {
    if (vibe !== chosenVibe) {
      updated[vibe as Vibe] = (updated[vibe as Vibe] ?? 0) * 0.98;
    }
  });
  
  return normalizeVibeDistribution(updated);
}