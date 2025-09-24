import { VIBES, safeVibe, type Vibe } from '@/lib/vibes';
import { applyPersonalDelta, loadPersonalDelta, type PersonalDelta, type ComponentKey } from './learning/PersonalWeightStore';
import type { ComponentScores, VibeVector } from './types';

// Base weights (your current table)
const BASE_WEIGHTS: Record<ComponentKey, Partial<Record<Vibe, number>>> = {
  circadian:   { hype:+0.7, energetic:+0.6, social:+0.4, chill:+0.1, down:-0.2 },
  movement:    { energetic:+0.8, flowing:+0.5, open:+0.3, social:+0.2, solo:-0.2, down:-0.3 },
  venueEnergy: { social:+0.6, romantic:+0.2, hype:+0.2, solo:-0.2, down:-0.2 },
  deviceUsage: { focused:+0.7, solo:+0.4, curious:+0.2, social:-0.2, hype:-0.3 },
  weather:     { open:+0.2, flowing:+0.2, social:+0.2, down:-0.2 },
};

// cached merged table
let _cache: { merged: typeof BASE_WEIGHTS; sig: string } | null = null;
function sigOf(delta: PersonalDelta) { return JSON.stringify(delta); }
function getEffectiveWeights() {
  const delta = loadPersonalDelta();
  const sig = sigOf(delta);
  if (_cache && _cache.sig === sig) return _cache.merged;
  const merged = applyPersonalDelta(BASE_WEIGHTS, delta);
  _cache = { merged, sig };
  return merged;
}

const sigmoid = (x:number)=> 1/(1+Math.exp(-x*2));

// Remove duplicate type exports - they're now in types.ts

export function combine(components: ComponentScores): VibeVector {
  const W = getEffectiveWeights();

  const raw = Object.fromEntries(VIBES.map(v => [v, 0])) as Record<Vibe, number>;
  (Object.keys(components) as ComponentKey[]).forEach((k) => {
    const c = components[k] ?? 0;
    const weights = W[k] ?? {};
    Object.entries(weights).forEach(([vibe, w]) => {
      raw[safeVibe(vibe)] += c * (w ?? 0);
    });
  });

  const squashed = Object.fromEntries(VIBES.map(v => [v, sigmoid(raw[v])])) as VibeVector;
  const sum = VIBES.reduce((s,v)=> s + squashed[v], 0) || 1;
  VIBES.forEach(v => (squashed[v] = squashed[v] / sum));
  return squashed;
}

/** naive confidence from component "agreement" */
export function confidence(components: ComponentScores): number {
  const vals = Object.values(components);
  const mean = vals.reduce((s,n)=>s+n,0)/Math.max(1,vals.length);
  const varc = vals.reduce((s,n)=>s+Math.pow(n-mean,2),0)/Math.max(1,vals.length);
  const agreement = 1 - Math.min(1, Math.sqrt(varc)); // lower variance → higher agreement
  return Math.max(0.35, Math.min(0.95, 0.5*agreement + 0.5*Math.max(...vals)));
}