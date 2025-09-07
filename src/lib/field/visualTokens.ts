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
