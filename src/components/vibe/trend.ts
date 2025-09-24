export type Trend = 'rising' | 'stable' | 'easing';

/** Simple linear-trend via least-squares slope on [0..1] confidences. */
export function computeTrend(vals: number[], epsilon = 0.04): Trend {
  const n = Array.isArray(vals) ? vals.length : 0;
  if (n < 7) return 'stable';

  const use = vals.slice(-Math.min(n, 32)); // cap window
  const m = use.length;
  const xs = Array.from({ length: m }, (_, i) => i);
  const xMean = (m - 1) / 2;
  const yMean = use.reduce((s, v) => s + v, 0) / m;

  let num = 0, den = 0;
  for (let i = 0; i < m; i++) {
    num += (xs[i] - xMean) * (use[i] - yMean);
    den += (xs[i] - xMean) ** 2;
  }
  const slope = den ? num / den : 0;
  if (slope > epsilon) return 'rising';
  if (slope < -epsilon) return 'easing';
  return 'stable';
}