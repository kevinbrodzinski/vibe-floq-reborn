import type { Vibe } from '@/types/vibes';

// keep this tiny file tree-shakable
export const vibeEmoji = (() => {
  const map: Record<string, string> = {
    chill:     "😌",
    hype:      "🔥",
    curious:   "🤔",
    social:    "👫",
    solo:      "🧘",
    romantic:  "💕",
    weird:     "🤪",
    down:      "😔",
    flowing:   "🌊",
    open:      "🌟",
  };
  return (vibe?: string | null): string => map[vibe?.toLowerCase() ?? ""] ?? "📍";
})();

export const vibeColor = (vibe: Vibe): string => {
  const colors = {
    chill: 'hsl(51 100% 65%)',
    social: 'hsl(24 100% 67%)', 
    hype: 'hsl(278 74% 71%)',
    flowing: 'hsl(174 84% 67%)',
    romantic: 'hsl(328 79% 70%)',
    solo: 'hsl(197 100% 50%)',
    weird: 'hsl(54 100% 67%)',
    down: 'hsl(220 9% 58%)',
    open: 'hsl(126 84% 75%)',
    curious: 'hsl(280 61% 68%)'
  };
  return colors[vibe] || colors.social;
};

export const vibeGradient = (vibe: Vibe): string => {
  return `radial-gradient(90% 90% at 50% 50%, ${vibeColor(vibe)} 0%, transparent 70%)`;
};

// RGB color mapping for calculations
const VIBE_COLORS = {
  chill: { r: 255, g: 255, b: 102 },     // yellow
  social: { r: 255, g: 140, b: 67 },     // orange
  hype: { r: 190, g: 74, b: 182 },       // purple
  flowing: { r: 67, g: 229, b: 180 },    // teal
  romantic: { r: 229, g: 67, b: 149 },   // pink
  solo: { r: 67, g: 149, b: 255 },       // blue
  weird: { r: 255, g: 230, b: 67 },      // bright yellow
  down: { r: 120, g: 120, b: 130 },      // muted gray
  open: { r: 120, g: 255, b: 120 },      // green
  curious: { r: 180, g: 120, b: 200 }    // light purple
} as const;

// ---------------------------------------------------------------------------
//  Quick accessor – returns the brand color for the dominant vibe in HSL
//  If you have a jsonb {"chill":5,"hype":2} just pass the key "chill".
// ---------------------------------------------------------------------------
export function dominantColor(vibe: Vibe | 'unknown', alpha = 1): string {
  const c = VIBE_COLORS[vibe as Vibe] ?? VIBE_COLORS.chill
  return `rgba(${c.r},${c.g},${c.b},${alpha})`
}

// Small helper to move a base hue toward a dominant vibe hue
export function blendHue(
  base: [number, number, number],
  vibe: Vibe | 'unknown',
  weight = 0.4         // 0 = no shift, 1 = only vibe hue
): [number, number, number] {
  const v = VIBE_COLORS[vibe as Vibe] ?? VIBE_COLORS.chill
  return [
    base[0] * (1 - weight) + v.r * weight,
    base[1] * (1 - weight) + v.g * weight,
    base[2] * (1 - weight) + v.b * weight,
  ]
}
