// Unified vector utilities with safe renormalization
import type { VibeVector } from '@/core/vibe/types';
import { VIBES, type Vibe } from '@/lib/vibes';

export const renormalizeVector = (vec: VibeVector): void => {
  const sum = VIBES.reduce((a, v) => a + (vec[v] ?? 0), 0) || 0;
  if (!sum) return;
  VIBES.forEach(v => { vec[v] = (vec[v] ?? 0) / sum; });
};

export const adjustVector = (vec: VibeVector, vibe: Vibe, delta: number, cap = 1): void => {
  vec[vibe] = Math.max(0, Math.min(cap, (vec[vibe] ?? 0) + delta));
  renormalizeVector(vec);
};

// Complete energy map for all 13 vibes
export const VIBE_ENERGY: Record<Vibe, number> = {
  hype: 1.0,
  flowing: 0.8, 
  social: 0.7,
  open: 0.6,
  curious: 0.6,
  weird: 0.5,
  romantic: 0.4,
  chill: 0.3,
  solo: 0.3,
  down: 0.1,
  energetic: 0.9,
  excited: 0.85,
  focused: 0.6
};