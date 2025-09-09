// src/lib/tokens/vibeTokens.ts
// Auto-generates design tokens for ALL vibes defined in src/lib/vibes.ts.

import type { Vibe } from '@/lib/vibes';
import { VIBES, VIBE_RGB } from '@/lib/vibes';

// Helpers
function rgbToCss([r, g, b]: [number, number, number]) {
  return `rgb(${r}, ${g}, ${b})`;
}
function rgba([r, g, b]: [number, number, number], a: number) {
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
function relativeLuminance([r, g, b]: [number, number, number]) {
  const n = [r, g, b].map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * n[0] + 0.7152 * n[1] + 0.0722 * n[2];
}

// Token shape
export type VibeToken = {
  /** solid color for UI fills, badges, etc. */
  base: string;
  /** subtle background behind cards/overlays */
  bg: string;
  /** text/icon color that contrasts with base */
  fg: string;
  /** glow for rings/shadows/atmospherics */
  glow: string;
  /** border/ring color */
  ring: string;
  /** gradient for animated backgrounds */
  gradient: string;
};

/**
 * For each Vibe, generate a full token set based on canonical RGB.
 */
export const VIBE_TOKENS: Record<Vibe, VibeToken> = Object.fromEntries(
  VIBES.map((v) => {
    const rgb = VIBE_RGB[v as Vibe] as [number, number, number];
    if (!rgb) throw new Error(`VIBE_RGB missing entry for vibe: ${v}`);

    const base = rgbToCss(rgb);
    const lum = relativeLuminance(rgb);
    const fg  = lum > 0.5 ? 'rgba(10, 10, 14, 0.92)' : 'rgba(255, 255, 255, 0.95)';

    const bg   = rgba(rgb, 0.08);
    const glow = rgba(rgb, 0.42);
    const ring = rgba(rgb, 0.28);

    const gradient = `radial-gradient(120% 120% at 50% 0%, ${rgba(rgb, 0.45)} 0%, ${rgba(rgb, 0.12)} 38%, rgba(0,0,0,0) 70%)`;

    const token: VibeToken = { base, bg, fg, glow, ring, gradient };
    return [v as Vibe, token];
  })
) as Record<Vibe, VibeToken>;

/** Safe accessor with helpful error in dev */
export function getVibeToken(vibe: Vibe): VibeToken {
  const t = VIBE_TOKENS[vibe];
  if (!t) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`Missing VIBE_TOKENS for vibe="${vibe}". Check src/lib/vibes.ts`);
    }
    // Fallback: neutral-ish token
    return {
      base: 'rgb(128,128,128)',
      bg: 'rgba(128,128,128,0.08)',
      fg: 'rgba(255,255,255,0.95)',
      glow: 'rgba(128,128,128,0.42)',
      ring: 'rgba(128,128,128,0.28)',
      gradient: 'radial-gradient(120% 120% at 50% 0%, rgba(128,128,128,0.45) 0%, rgba(128,128,128,0.12) 38%, rgba(0,0,0,0) 70%)'
    };
  }
  return t;
}