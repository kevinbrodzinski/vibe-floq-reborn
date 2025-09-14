export type Trend = 'rising' | 'stable' | 'easing';

export function computeTrend(vals: number[], epsilon = 0.04): Trend {
  if (!vals || vals.length < 5) return 'stable';
  // simple slope on last 10 (or fewer) points
  const use = vals.slice(-10);
  const n = use.length;
  const xs = use.map((_, i) => i);
  const xMean = (n - 1) / 2;
  const yMean = use.reduce((s, v) => s + v, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { 
    num += (xs[i] - xMean) * (use[i] - yMean); 
    den += (xs[i] - xMean) ** 2; 
  }
  const slope = den ? num / den : 0; // per sample
  // normalize to 0..1 per sample; we already have confidences in 0..1
  if (slope > epsilon) return 'rising';
  if (slope < -epsilon) return 'easing';
  return 'stable';
}