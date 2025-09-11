import type { VibePoint } from '@/types/vibe';
import type { EnvironmentalSignal } from '@/lib/vibe/collectors/EnvironmentalCollector';

// Clamp helpers
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/**
 * Blend environmental aggregates into vibe point.
 * Caps environmental influence ≤ 0.30 of total, and only with enough quality frames.
 */
export function applyEnvironmental(v: VibePoint, env: EnvironmentalSignal | null, quality01: number): VibePoint {
  if (!env || quality01 < 0.3) return v;

  const audio = env.audioRms01 ?? 0;
  const motion = env.motionVar01 ?? 0;

  // Tiny, smooth deltas — we never yank energy hard with environment alone.
  // Audio: high RMS → lively ambience → small boost
  // Motion variance: more variance → activity → small boost
  const envEnergyDelta = clamp01(0.12 * audio + 0.08 * motion) * quality01; // ≤0.20 scaled
  const nextEnergy = clamp01(v.energy + envEnergyDelta);

  // Confidence bump from stable frames
  const diversityBump = Math.min(0.1, (env.frames.audio + env.frames.motion) / 200); // tiny boost
  const nextConfidence = clamp01(v.confidence + (quality01 * 0.1) + diversityBump);

  const nextBreakdown = {
    primary: v.breakdown?.primary ?? 0.7,
    behavioral: v.breakdown?.behavioral ?? 0.2,
    environmental: clamp01((v.breakdown?.environmental ?? 0) + envEnergyDelta),
    social: v.breakdown?.social ?? 0.05,
  };

  return {
    ...v,
    energy: nextEnergy,
    confidence: nextConfidence,
    breakdown: nextBreakdown,
    sources: Array.from(new Set([...(v.sources ?? []), 'environmental'])),
  };
}