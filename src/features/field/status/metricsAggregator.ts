/**
 * Social Weather Metrics Aggregator
 * Converts live pressure/flow/lanes/aurora into composer inputs
 */

import type { SocialWeatherMetrics } from './SocialWeatherComposer';

const clamp = (n: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, n));

export function aggregateWeatherMetrics({
  pressureCells, 
  flowCells, 
  convergences, 
  auroraActive, 
  placeLabel
}: {
  pressureCells: Array<{ p: number; gx: number; gy: number }>;
  flowCells: Array<{ vx: number; vy: number }>;
  convergences: Array<{ id: string }>;
  auroraActive: number;
  placeLabel?: string;
}): SocialWeatherMetrics {
  // Pressure metrics
  const Pn = Math.max(1, pressureCells.length);
  const meanP = pressureCells.reduce((s, c) => s + c.p, 0) / Pn;
  const stdP = Math.sqrt(pressureCells.reduce((s, c) => s + (c.p - meanP) ** 2, 0) / Pn);
  const meanG = pressureCells.reduce((s, c) => s + Math.hypot(c.gx, c.gy), 0) / Pn;

  // Wind/flow strength
  const Fn = Math.max(1, flowCells.length);
  const windsStrength = clamp(flowCells.reduce((s, f) => s + Math.hypot(f.vx, f.vy), 0) / Fn);

  // Lane density: normalize by a heuristic cell count
  const laneDensity = clamp((convergences?.length ?? 0) / 20);

  return {
    meanPressure: clamp(meanP),
    stdPressure: clamp(stdP),
    meanGradient: clamp(meanG),
    windsStrength,
    laneDensity,
    auroraActive: clamp(auroraActive),
    placeLabel
  };
}