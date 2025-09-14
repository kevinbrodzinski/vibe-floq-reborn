import type { CorrectionHistory } from './CorrectionStore';
import type { ComponentScores } from '@/core/vibe/types';
import { loadPersonalDelta, savePersonalDelta } from './PersonalWeightStore';

type Gradient = Record<keyof ComponentScores, number>;

const LR = 0.005;           // conservative learning rate
const DELTA_MIN = -0.30;    // clamp
const DELTA_MAX =  +0.30;

export class PersonalWeightLearner {
  async learn(corrections: CorrectionHistory[]) {
    if (!corrections.length) return;

    // Simple "context cluster": morning coffee & frequent pattern first
    const clusters: CorrectionHistory[][] = [];
    const morningCoffee = corrections.filter(c =>
      c.context.temporal.hour >= 6 &&
      c.context.temporal.hour <= 10 &&
      c.context.venue?.type === 'coffee'
    );
    if (morningCoffee.length >= 3) clusters.push(morningCoffee);

    // fallback: use all data (low weight)
    clusters.push(corrections.slice(-20));

    let deltas = loadPersonalDelta(); // {circadian:{...vibe}, movement:{...}, ...}

    for (const group of clusters) {
      const g = this.gradient(group);
      // Apply per-component gradient to the dominant vibe(s) user corrected to most
      // Practical: if user corrects toward "focused" in a context, increase deviceUsage/focused slightly.
      // Here we distribute component deltas without vibe-specific targeting to keep it simple & stable.

      (Object.keys(g) as (keyof ComponentScores)[]).forEach(comp => {
        // Raise/lower overall component importance slightly
        // We apply to every vibe inside comp delta table uniformly to avoid overfitting on one class
        const vibes = Object.keys(deltas[comp] || {}) as (keyof typeof deltas[typeof comp])[];
        vibes.forEach(v => {
          const curr = deltas[comp]![v] ?? 0;
          const next = Math.max(DELTA_MIN, Math.min(DELTA_MAX, curr + LR * g[comp]));
          deltas[comp]![v] = +next.toFixed(3);
        });
      });
    }

    savePersonalDelta(deltas);
  }

  private gradient(group: CorrectionHistory[]): Gradient {
    // error = (corrected target minus predicted mass on that corrected vibe)
    // attribute error proportionally to component strengths
    const out: any = { circadian: 0, movement: 0, venueEnergy: 0, deviceUsage: 0, weather: 0 };
    group.forEach(c => {
      // treat corrected vibe "energy" as 1, predicted share on that vibe as predicted[corrected]
      const pred = c.predicted[c.corrected] ?? 0;
      const err = 1 - pred; // push mass toward corrected vibe

      // attribute by component strength (components in 0..1)
      let weightSum = 0;
      (Object.values(c.components) as number[]).forEach(v => weightSum += v || 0.0001);
      (Object.keys(out) as (keyof ComponentScores)[]).forEach(k => {
        const contrib = c.components[k] ?? 0;
        out[k] += (err * (contrib / weightSum));
      });
    });

    // Average
    (Object.keys(out) as (keyof ComponentScores)[]).forEach(k => {
      out[k] = out[k] / Math.max(1, group.length);
    });
    return out;
  }
}
