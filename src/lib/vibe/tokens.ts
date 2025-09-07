/**
 * Vibe token system - routes through design system tokens
 * Import from canonical source, not local hex maps
 */

import type { VibeToken } from '@/types/field';

// TODO: Import from central vibe token map (e.g. src/lib/vibeConstants.ts)
// For now, using design-system-aligned colors
export const vibeTokens: Record<VibeToken, string> = {
  hype: '#7C3AED',      // violet-600
  social: '#F59E0B',    // amber-500
  chill: '#3B82F6',     // blue-500
  flowing: '#06B6D4',   // cyan-500
  open: '#10B981',      // emerald-500
  curious: '#8B5CF6',   // violet-500
  solo: '#6B7280',      // gray-500
  romantic: '#EC4899',  // pink-500
  weird: '#EAB308',     // yellow-500
  down: '#374151',      // gray-700
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