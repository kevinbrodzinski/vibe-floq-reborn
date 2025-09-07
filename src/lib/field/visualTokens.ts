// Visual-only tokens (colors/sizes). Keep thresholds in constants.ts.
export const flowTokens = {
  arrow: { lengthPx: 22, widthPx: 3, alpha: 0.75 },
  color: { low: '#93c5fd', mid: '#60a5fa', high: '#3b82f6' },
  gridPx: 56,            // vector sampling grid (screen px)
  dashHz: 0.8,           // subtle phase wiggle
} as const;

export const laneTokens = {
  strokePx: 3,
  glowPx: 8,
  dotRadiusPx: 5,
  color: { base: '#fbbf24', strong: '#f59e0b' },
  dashHz: 1.2,
} as const;

export const momentumTokens = {
  badgeSize: 10,
  strokeWidth: 3,
  alpha: 0.9,
  color: '#ffffff',
} as const;

export const pressureTokens = {
  // soft, cool neutrals — adjust via design system later
  color: { low: '#c7d2fe', mid: '#93c5fd', high: '#60a5fa' },
  alpha: 0.6,
  cellRadiusPx: 42,      // base cloud radius
  glowBoost: 1.2,        // optional scale for strong cells
} as const;

export const stormTokens = {
  haloColor: '#fbbf24',  // semantic amber glow
  haloAlpha: 0.85,
  haloRadiusPx: 64,      // base halo radius (scaled by intensity)
  ttlMs: 2200,           // UI fade TTL when stale
} as const;

// Phase 4 visual tokens
export const windTokens = {
  colorLow:  '#93c5fd',
  colorMid:  '#60a5fa',
  colorHigh: '#3b82f6',
  alpha: 0.75,
  widthPx: 3,
  arrowLenPx: 22,
  dashHz: 0.8,
} as const;

export const auroraTokens = {
  colors: ['#a78bfa','#60a5fa','#34d399'], // themed gradients
  alpha: 0.85,
  maxRadiusPx: 180,
  waveHz: 1.2,
} as const;

export const atmoTintTokens = {
  // linear gradient [top,bottom], multiply/mix on top layers
  dawn:   { top:'#fde68a', bottom:'#93c5fd', alpha:0.16 },
  morning:{ top:'#bfdbfe', bottom:'#e0f2fe', alpha:0.14 },
  noon:   { top:'#e5e7eb', bottom:'#bfdbfe', alpha:0.12 },
  dusk:   { top:'#c7d2fe', bottom:'#fca5a5', alpha:0.18 },
  night:  { top:'#111827', bottom:'#1f2937', alpha:0.20 },
} as const;
