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

function venueEnergyScore(dwellMin: number | undefined) {
  if (!dwellMin) return 0;
  if (dwellMin > 20) return 0.7;
  if (dwellMin > 5) return 0.4;
  return 0.2;
}

function deviceUsageScore(screenOn01: number | undefined) {
  if (screenOn01 == null) return 0.3;
  return Math.max(0, Math.min(1, 0.2 + 0.8 * screenOn01));
}

function weatherScore(isDaylight: boolean | undefined) {
  return isDaylight === true ? 0.4 : 0.1;
}

export function evaluate(inp: EngineInputs): VibeReading {
  const t0 = performance.now();
  const components: ComponentScores = {
    circadian: circadianScore(inp.hour, inp.isWeekend),
    movement: movementScore(inp.speedMps),
    venueEnergy: venueEnergyScore(inp.dwellMinutes),
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