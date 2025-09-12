import type { VibePoint, EnvironmentalSignal, SocialSignal } from '@/types/vibe';

// Clamp helpers
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/**
 * Blend environmental aggregates into vibe point.
 * Caps environmental influence ≤ 0.30 of total, and only with enough quality frames.
 * Guards against spikes on first frame with quality scaling.
 */
export function applyEnvironmental(v: VibePoint, env: EnvironmentalSignal | null, quality01: number): VibePoint {
  if (!env || quality01 < 0.3) return v;

  const rawAudio = env.audioRms01 ?? 0;
  const motion = env.motionVar01 ?? 0;

  // Guard against mic spikes when quality is low
  const audio = (quality01 < 0.4 && rawAudio > 0.7) ? 0.7 : rawAudio;

  // Scale quality to prevent spikes on first frame
  const qualityScaled = quality01 < 0.5 ? quality01 * 0.5 : quality01;

  // Tiny, smooth deltas — we never yank energy hard with environment alone.
  // Audio: high RMS → lively ambience → small boost
  // Motion variance: more variance → activity → small boost
  const envEnergyDelta = clamp01(0.12 * audio + 0.08 * motion) * qualityScaled;
  const nextEnergy = clamp01(v.energy + envEnergyDelta);

  // Confidence bump from stable frames
  const diversityBump = Math.min(0.1, (env.frames.audio + env.frames.motion) / 200); // tiny boost
  const nextConfidence = clamp01(v.confidence + (qualityScaled * 0.1) + diversityBump);

  const nextBreakdown = {
    primary: v.breakdown?.primary ?? 0.7,
    behavioral: v.breakdown?.behavioral ?? 0.2,
    environmental: clamp01((v.breakdown?.environmental ?? 0) + envEnergyDelta),
    social: v.breakdown?.social ?? 0.05,
  };

  // Normalize breakdown to ensure sum = 1
  const sum = nextBreakdown.primary + nextBreakdown.behavioral + nextBreakdown.environmental + nextBreakdown.social;
  if (sum > 0) {
    nextBreakdown.primary /= sum;
    nextBreakdown.behavioral /= sum;  
    nextBreakdown.environmental /= sum;
    nextBreakdown.social /= sum;
  }

  return {
    ...v,
    energy: nextEnergy,
    confidence: nextConfidence,
    breakdown: nextBreakdown,
    sources: Array.from(new Set([...(v.sources ?? []), 'environmental'])),
  };
}

/**
 * Blend social signals into vibe point.
 * Conservative social influence (≤15% energy boost) based on friend cohesion and convergence.
 */
export function applySocial(v: VibePoint, s: SocialSignal | null, quality01: number): VibePoint {
  if (!s || quality01 < 0.3) return v;

  // Cohesion and convergence raise energy slightly (≤ ~0.15 total)
  const coh = s.cohesion01 ?? 0;
  const conv = s.convergenceProb01 ?? 0;
  const socialDelta = clamp01(0.10 * coh + 0.08 * conv) * (quality01 * 0.8);
  const nextEnergy = clamp01(v.energy + socialDelta);

  // Confidence: small bump from signal diversity + head count
  const diversity = Math.min(0.08, s.sampleCount * 0.01);
  const nextConfidence = clamp01(v.confidence + (quality01 * 0.06) + diversity);

  // Update breakdown (cap keeps social under ~0.25 share)
  const nextBreakdown = {
    primary: v.breakdown?.primary ?? 0.65,
    behavioral: v.breakdown?.behavioral ?? 0.2,
    environmental: v.breakdown?.environmental ?? 0.1,
    social: clamp01((v.breakdown?.social ?? 0.05) + socialDelta),
  };

  // Normalize breakdown to ensure sum = 1
  const sum = nextBreakdown.primary + nextBreakdown.behavioral + nextBreakdown.environmental + nextBreakdown.social;
  if (sum > 0) {
    nextBreakdown.primary /= sum;
    nextBreakdown.behavioral /= sum;
    nextBreakdown.environmental /= sum;
    nextBreakdown.social /= sum;
  }

  return {
    ...v,
    energy: nextEnergy,
    confidence: nextConfidence,
    breakdown: nextBreakdown,
    sources: Array.from(new Set([...(v.sources ?? []), 'social'])),
  };
}