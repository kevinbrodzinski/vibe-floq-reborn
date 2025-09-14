export type Trend = 'rising' | 'stable' | 'easing';

export function computeTrend(vals: number[], epsilon = 0.04): Trend {
  if (!vals || vals.length < 7) return 'stable';
  // simple slope on last 10 (or fewer) points
  const use = vals.slice(-10);
  const n = use.length;
  const aCount = Math.floor(n / 2);
  const a = use.slice(0, aCount).reduce((s, v) => s + v, 0) / Math.max(1, aCount);
  const b = use.slice(aCount).reduce((s, v) => s + v, 0) / Math.max(1, n - aCount);
  
  if (b - a > epsilon) return 'rising';
  if (a - b > epsilon) return 'easing';
  return 'stable';
}