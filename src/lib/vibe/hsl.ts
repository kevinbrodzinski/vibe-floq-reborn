// Token hex vs. hue system
// 
// Short answer: use both—**token as the source of truth**, **hue as a derived effect**.
//
// **Token hex (vibeTokens)**
// - Pros: brand-consistent, matches all other UI accents, easy to QA
// - Cons: flat if used 1:1 for particles; less "alive"
//
// **Hue (HSL) as an effect channel**  
// - Pros: gives controlled variation (drift, pulses, density cues) without changing core brand
// - Cons: if you hard-code hue tables you can drift away from design tokens
//
// **Recommendation**
// 1. Keep vibeTokens as canonical color (pills, avatar rings, borders)
// 2. Derive HSL hue from token for motion/atmosphere (particle field, ripples, soft glows)  
// 3. Optional tiny hue drift (±6-10°) and lightness/saturation modulation for "alive" feel
// 
// Result: brand alignment + vibe-driven motion

import type { Vibe } from '@/lib/vibes';
import { VIBE_RGB } from '@/lib/vibes';

export function rgbToHsl([r, g, b]: [number, number, number]): { h: number; s: number; l: number } {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const l = (max + min) / 2;
  
  let h = 0;
  let s = 0;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case rNorm: h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0); break;
      case gNorm: h = (bNorm - rNorm) / d + 2; break;
      case bNorm: h = (rNorm - gNorm) / d + 4; break;
    }
    h *= 60;
  }
  
  return { 
    h: Math.round(h), 
    s: Math.round(s * 100), 
    l: Math.round(l * 100) 
  };
}

export function rgbToHex([r, g, b]: [number, number, number]): string {
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Get canonical hex color for vibe (for UI accents, borders, pills)
 */
export function vibeToHex(vibe: Vibe): string {
  return rgbToHex(VIBE_RGB[vibe]);
}

/**
 * Get hue value for atmospheric effects (particles, glows, animations)
 */
export function vibeToHue(vibe: Vibe): number {
  return rgbToHsl(VIBE_RGB[vibe]).h;
}

/**
 * Generate living hue with subtle drift for atmospheric effects
 */
export function vibeToDriftedHue(vibe: Vibe, time = performance.now()): number {
  const baseHue = vibeToHue(vibe);
  const drift = Math.sin(time * 0.001) * 6; // ±6° drift
  return baseHue + drift;
}

/**
 * Create HSL string with optional drift for particles and atmospheric effects
 */
export function vibeToHsl(vibe: Vibe, options?: {
  saturation?: number;
  lightness?: number;
  alpha?: number;
  drift?: boolean;
}): string {
  const { saturation = 75, lightness = 65, alpha = 0.7, drift = false } = options || {};
  const hue = drift ? vibeToDriftedHue(vibe) : vibeToHue(vibe);
  
  return alpha < 1 
    ? `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`
    : `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}
