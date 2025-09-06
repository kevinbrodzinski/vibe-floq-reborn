/**
 * Convert between HSL vibe objects and vibe tokens
 */

import type { VibeToken } from '@/types/field';
import { normalizeVibeToken } from './tokens';

export interface HSLVibe {
  h: number;
  s: number;
  l: number;
}

/**
 * Convert HSL vibe object to vibe token
 * Uses closest match based on hue
 */
export const hslToVibeToken = (hsl: HSLVibe): VibeToken => {
  const vibeHues: Record<VibeToken, number> = {
    hype: 280,
    social: 30,
    chill: 240,
    flowing: 200,
    open: 120,
    curious: 260,
    solo: 180,
    romantic: 320,
    weird: 60,
    down: 210,
  };

  // Find closest hue match
  let closestVibe: VibeToken = 'social';
  let closestDistance = 360;

  for (const [vibe, hue] of Object.entries(vibeHues)) {
    const distance = Math.min(
      Math.abs(hsl.h - hue),
      360 - Math.abs(hsl.h - hue) // circular distance
    );
    
    if (distance < closestDistance) {
      closestDistance = distance;
      closestVibe = vibe as VibeToken;
    }
  }

  return closestVibe;
};

/**
 * Convert vibe token to HSL object
 */
export const vibeTokenToHSL = (vibe: VibeToken): HSLVibe => {
  const vibeHSL: Record<VibeToken, HSLVibe> = {
    hype: { h: 280, s: 70, l: 60 },
    social: { h: 30, s: 70, l: 60 },
    chill: { h: 240, s: 70, l: 60 },
    flowing: { h: 200, s: 70, l: 60 },
    open: { h: 120, s: 70, l: 60 },
    curious: { h: 260, s: 70, l: 60 },
    solo: { h: 180, s: 70, l: 60 },
    romantic: { h: 320, s: 70, l: 60 },
    weird: { h: 60, s: 70, l: 60 },
    down: { h: 210, s: 30, l: 40 },
  };

  return vibeHSL[vibe] || vibeHSL.social;
};