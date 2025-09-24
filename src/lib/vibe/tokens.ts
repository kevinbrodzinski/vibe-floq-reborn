/**
 * Vibe token system - routes through design system tokens
 * Import from canonical source, not local hex maps
 */

import type { VibeToken } from '@/types/field';

import { VIBE_RGB } from '@/lib/vibes';

// Convert RGB to hex for PIXI compatibility
const rgbToHex = ([r, g, b]: [number, number, number]): string => {
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

// Central vibe token map using canonical design system colors
export const vibeTokens: Record<VibeToken, string> = {
  hype: rgbToHex(VIBE_RGB.hype),
  social: rgbToHex(VIBE_RGB.social),
  chill: rgbToHex(VIBE_RGB.chill),
  flowing: rgbToHex(VIBE_RGB.flowing),
  open: rgbToHex(VIBE_RGB.open),
  curious: rgbToHex(VIBE_RGB.curious),
  solo: rgbToHex(VIBE_RGB.solo),
  romantic: rgbToHex(VIBE_RGB.romantic),
  weird: rgbToHex(VIBE_RGB.weird),
  down: rgbToHex(VIBE_RGB.down),
};

export const vibeToTint = (vibe: VibeToken): number => {
  const hex = vibeTokens[vibe];
  if (!hex) return 0x3B82F6; // default blue
  
  const cleanHex = hex.replace('#', '');
  return parseInt(cleanHex, 16);
};

// Convert vibe string to token
export const normalizeVibeToken = (vibe: string): VibeToken => {
  const normalized = vibe?.toLowerCase() as VibeToken;
  return vibeTokens[normalized] ? normalized : 'social';
};

// Atmosphere/Field visual tokens (design system)
export const atmoTokens = {
  convergencePrimary: '#fbbf24', // amber-400 semantic token
  convergenceSecondary: '#f59e0b', // amber-500 
  breathingGlow: '#ffffff', // white for base glow
} as const;

// Visual sizing tokens for atmospheric effects
export const visualTokens = {
  atmo: {
    particleSize: 2,
    convergenceMarkerSize: 6,
    glowAlphaBase: 0.3,
    breathingScaleVariation: 0.18, // 18% max scale variation
  },
  cluster: {
    baseMergeDistance: 42, // px at zoom 11
    breathingFrequency: 0.003, // radians/ms
  },
} as const;