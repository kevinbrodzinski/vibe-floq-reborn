import type { Vibe } from './types';
import { VIBES } from '@/lib/vibes';

/**
 * Vector renormalization helper to maintain probability distribution
 * Used after any vector-level adjustments to ensure sum = 1
 */
export const renormalizeVector = (vector: Record<Vibe, number>): void => {
  const sum = VIBES.reduce((acc, vibe) => acc + (vector[vibe] ?? 0), 0) || 1;
  VIBES.forEach(vibe => {
    vector[vibe] = (vector[vibe] ?? 0) / sum;
  });
};

/**
 * Safe vector adjustment that caps changes and renormalizes
 */
export const adjustVector = (
  vector: Record<Vibe, number>, 
  vibe: Vibe, 
  adjustment: number,
  maxValue = 1.0
): void => {
  const currentValue = vector[vibe] ?? 0;
  vector[vibe] = Math.max(0, Math.min(maxValue, currentValue + adjustment));
  renormalizeVector(vector);
};