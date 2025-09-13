import { VIBE_COLORS, type Vibe } from '@/lib/vibes';

interface VibeColorInput {
  vibeKey?: string;
  vibeHex?: string;
  venueId?: string;
  venueName?: string;
}

/**
 * Future-proof vibe color resolver for Flow route venues.
 * Priority: vibeHex > vibeKey > fallback
 */
export function resolveVibeHex(input: VibeColorInput): string | undefined {
  // Direct hex override takes priority
  if (input.vibeHex) {
    return input.vibeHex;
  }
  
  // Convert vibeKey to color if valid
  if (input.vibeKey && input.vibeKey in VIBE_COLORS) {
    const rgb = VIBE_COLORS[input.vibeKey as Vibe];
    // Convert rgb(r, g, b) to #rrggbb
    const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      const [, r, g, b] = match;
      return `#${[r, g, b].map(x => parseInt(x).toString(16).padStart(2, '0')).join('')}`;
    }
  }
  
  // Future: venue-based vibe lookup could go here
  // if (input.venueId) { ... }
  
  return undefined;
}