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
