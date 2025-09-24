import { VIBES, type Vibe } from '@/lib/vibes';
import type { ComponentKey } from '@/core/vibe/types';

// Component keys used by the engine
export { type ComponentKey } from '@/core/vibe/types';

// Delta table: how much we nudge each vibe for each component (additive over base weights)
export type PersonalDelta = Record<ComponentKey, Partial<Record<Vibe, number>>>;

const LS_KEY = 'vibe:personal:delta:v1';

// Safe JSON parse with fallback
function safeParse<T>(raw: string | null, fallback: T): T {
  try { 
    const x = JSON.parse(raw ?? ''); 
    return (x && typeof x === 'object') ? x as T : fallback;
  } catch { 
    return fallback; 
  }
}

// Small helper to create empty table
function emptyDelta(): PersonalDelta {
  const out: PersonalDelta = { circadian: {}, movement: {}, venueEnergy: {}, deviceUsage: {}, weather: {} };
  VIBES.forEach(v => {
    out.circadian[v] = 0; 
    out.movement[v] = 0; 
    out.venueEnergy[v] = 0; 
    out.deviceUsage[v] = 0; 
    out.weather[v] = 0;
  });
  return out;
}

// Load/save
export function loadPersonalDelta(): PersonalDelta {
  try { 
    return safeParse(localStorage.getItem(LS_KEY), emptyDelta());
  } catch { 
    return emptyDelta(); 
  }
}
export function savePersonalDelta(d: PersonalDelta) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(d)); } catch {}
}

/**
 * Update rule: when user corrects predicted vibe → target vibe,
 * nudge components proportionally to their (0..1) score at that time.
 * - We *increase* deltas for (component, target) and *decrease* for (component, predicted)
 * - Rare, bounded, and tiny steps (η) to avoid oscillations
 */
export function learnFromCorrection(params: {
  predicted: Vibe,
  target: Vibe,
  componentScores: Record<ComponentKey, number>, // 0..1 as used by engine
  eta?: number // learning rate (default 0.02)
}) {
  const { predicted, target, componentScores } = params;
  const eta = params.eta ?? 0.02;

  const delta = loadPersonalDelta();
  (Object.keys(componentScores) as ComponentKey[]).forEach((ck) => {
    const c = Math.max(0, Math.min(1, componentScores[ck] ?? 0));
    // push up target
    delta[ck]![target] = (delta[ck]![target] ?? 0) + eta * c;
    // pull down predicted
    delta[ck]![predicted] = (delta[ck]![predicted] ?? 0) - eta * c;
    // clamp to small range
    VIBES.forEach(v => { delta[ck]![v] = Math.max(-0.5, Math.min(0.5, delta[ck]![v] ?? 0)); });
  });

  savePersonalDelta(delta);
}

/** Merge base weights + personal delta at read-time */
export function applyPersonalDelta<T extends Record<ComponentKey, Partial<Record<Vibe, number>>>>(
  base: T,
  d: PersonalDelta
): T {
  const merged = JSON.parse(JSON.stringify(base)) as T;
  (Object.keys(d) as ComponentKey[]).forEach((ck) => {
    Object.entries(d[ck] || {}).forEach(([vibe, delta]) => {
      merged[ck]![vibe as Vibe] = (merged[ck]![vibe as Vibe] ?? 0) + (delta ?? 0);
    });
  });
  return merged;
}

/** Optional: very small periodic decay to re-center deltas */
/** Optional: very small periodic decay to re-center deltas */
export function decayPersonalDelta(factor = 0.995) {
  const d = loadPersonalDelta();
  (Object.keys(d) as ComponentKey[]).forEach(k => {
    Object.keys(d[k]!).forEach(v => {
      const next = +((d[k]![v as Vibe] ?? 0) * factor).toFixed(3);
      d[k]![v as Vibe] = Math.abs(next) < 0.001 ? 0 : next;
    });
  });
  savePersonalDelta(d);
}