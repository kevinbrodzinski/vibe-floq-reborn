import type { EngineInputs, VibeReading, ComponentScores } from './types';
import { combine, confidence } from './MasterEquation';
import { VIBES, safeVibe, type Vibe } from '@/lib/vibes';

function circadianScore(hour: number, isWeekend: boolean) {
  // 0..1 bump in evening, milder weekday mornings
  if (hour >= 17 && hour <= 22) return 0.8;
  if (!isWeekend && hour >= 9 && hour <= 12) return 0.6;
  if (hour < 6) return 0.2;
  return 0.5;
}

function movementScore(speedMps: number | undefined) {
  if (!speedMps) return 0;
  return Math.max(0, Math.min(1, speedMps / 2)); // ~2m/s cap
}

function venueEnergyScore(dwellMin: number | undefined, arrived?: boolean) {
  let score = 0;
  if (arrived) score += 0.05;            // arrived bump
  if (dwellMin != null) {
    if (dwellMin > 20) score += 0.2;     // long dwell bump
    else if (dwellMin > 5) score += 0.1; // minor dwell bump
  }
  return Math.min(1, score);
}

function deviceUsageScore(screenOn01: number | undefined) {
  if (screenOn01 == null) return 0.3;
  // recent foreground time drives "focused/engaged" component
  return 0.2 + 0.8 * Math.max(0, Math.min(1, screenOn01));
}

function weatherScore(isDaylight: boolean | undefined) {
  return isDaylight === true ? 0.4 : 0.1;
}

export function evaluate(inp: EngineInputs): VibeReading {
  const t0 = performance.now();
  const components: ComponentScores = {
    circadian: circadianScore(inp.hour, inp.isWeekend),
    movement: movementScore(inp.speedMps),
    venueEnergy: venueEnergyScore(inp.dwellMinutes, inp.venueArrived),
    deviceUsage: deviceUsageScore(inp.screenOnRatio01),
    weather: weatherScore(inp.isDaylight),
  };
  const vector = combine(components);
  const best = VIBES.reduce((a, b) => (vector[b] > vector[a] ? b : a), VIBES[0]);
  const conf = confidence(components);

  const calcMs = Math.max(0, performance.now() - t0);
  return { 
    timestamp: Date.now(), 
    vibe: best, 
    confidence01: conf, 
    components, 
    vector, 
    calcMs 
  };
}