import type { EngineInputs, VibeReading, ComponentScores } from './types';
import { combine, confidence } from './MasterEquation';
import { VIBES } from '@/lib/vibes';

// helpers
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

function circadianScore(hour: number, isWeekend: boolean) {
  if (hour >= 17 && hour <= 22) return 0.8;
  if (!isWeekend && hour >= 9 && hour <= 12) return 0.6;
  if (hour < 6) return 0.2;
  return 0.5;
}
const movementScore = (speed?: number) => clamp01((speed ?? 0) / 2);

// NEW: base + arrival bump + dwell bump
function venueEnergyScore(base?: number | null, dwellMin?: number, arrived?: boolean) {
  let score = base ?? 0.5;
  if (arrived) score += 0.05;
  if (dwellMin != null) {
    if (dwellMin > 20) score += 0.2;
    else if (dwellMin > 5) score += 0.1;
  }
  return clamp01(score);
}
const deviceUsageScore = (ratio?: number) => (ratio == null ? 0.3 : clamp01(0.2 + 0.8 * ratio));
const weatherScore = (isDaylight?: boolean) => (isDaylight ? 0.4 : 0.1);

export function evaluate(inp: EngineInputs): VibeReading {
  const t0 = performance.now();
  const components: ComponentScores = {
    circadian:   circadianScore(inp.hour, inp.isWeekend),
    movement:    movementScore(inp.speedMps),
    venueEnergy: venueEnergyScore(inp.venueEnergyBase, inp.dwellMinutes, inp.venueArrived),
    deviceUsage: deviceUsageScore(inp.screenOnRatio01),
    weather:     weatherScore(inp.isDaylight),
  };

  const vector = combine(components);
  const best = VIBES.reduce((a, b) => (vector[b] > vector[a] ? b : a), VIBES[0]);
  const conf = confidence(components);

  return {
    timestamp: Date.now(),
    vibe: best,
    confidence01: conf,
    components,
    vector,
    calcMs: Math.max(0, performance.now() - t0),
  };
}