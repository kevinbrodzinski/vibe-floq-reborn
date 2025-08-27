import type { PolicyDecision } from '@/integrations/supabase/api-contracts';

export type PolicyInput = {
  // calibrated confidence ∈ [0,1]
  theta: number;
  // forecast band width (uncertainty) ∈ [0,1] — for MVP you may pass a proxy
  omega: number;
  // band indices for band-based hysteresis; omit if unknown
  band?: number;
  prevBand?: number;

  // timing
  nowMs: number;
  lastChangeAtMs?: number;

  // policy class key for min-interval lookup (presence, music.switch, work.status, etc.)
  classKey: string;

  // gates (optional overrides)
  thetaMin?: number;   // default 0.75
  omegaMax?: number;   // default 0.15
  minIntervalMs?: number; // default from CLASS_MIN_INTERVALS

  // safety
  venueSafetySuppressed?: boolean; // driving/call/sensitive place
};

export function evaluatePolicyLadder(input: PolicyInput): PolicyDecision {
  const thetaMin = input.thetaMin ?? 0.75;
  const omegaMax = input.omegaMax ?? 0.15;
  const minInterval = input.minIntervalMs ?? (CLASS_MIN_INTERVALS[input.classKey] ?? 30_000);

  // 1) Venue/safety
  if (input.venueSafetySuppressed) {
    return deny('venue_safety', false, false);
  }

  // 2) Confidence θ
  if (input.theta < thetaMin) {
    return deny('low_confidence', false, false);
  }

  // 3) Uncertainty ω
  if (input.omega > omegaMax) {
    return deny('high_uncertainty', false, false);
  }

  // 4) Min-interval
  if (input.lastChangeAtMs && input.nowMs - input.lastChangeAtMs < minInterval) {
    return deny('min_interval', true, false);
  }

  // 5) Hysteresis — prefer band-based; if bands unknown, fall back to time cushion
  if (hasNumber(input.band) && hasNumber(input.prevBand)) {
    if (Math.abs(input.band! - input.prevBand!) < 1) {
      return deny('hysteresis', false, true);
    }
  } else if (input.lastChangeAtMs) {
    if (input.nowMs - input.lastChangeAtMs < HYSTERESIS_CUSHION_MS) {
      return deny('hysteresis', false, true);
    }
  }

  return {
    allowed: true,
    reason: 'ok',
    redactionLevel: 'banded', // default; identity APIs may choose to return raw if policy allows
    observability: {
      min_interval_enforced: false,
      hysteresis_applied: false,
    },
  };
}

function deny(
  reason: NonNullable<PolicyDecision['reason']>,
  minInterval: boolean,
  hysteresis: boolean
): PolicyDecision {
  return {
    allowed: false,
    reason,
    redactionLevel: 'banded',
    observability: {
      min_interval_enforced: minInterval,
      hysteresis_applied: hysteresis,
    },
  };
}

function hasNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

// Defaults — can later be fetched from DB min_interval_table
const CLASS_MIN_INTERVALS: Record<string, number> = {
  presence: 30_000,
  'music.switch': 40_000,
  'work.status': 30 * 60_000,
  'home.lighting': 15_000,
  'home.HVAC': 8 * 60_000,
};

const HYSTERESIS_CUSHION_MS = 5_000;

/**
 * Get min interval for a given class
 */
export function getMinInterval(classKey: string): number {
  return CLASS_MIN_INTERVALS[classKey] ?? 30_000;
}

/**
 * Check if enough time has passed since last change
 */
export function isMinIntervalMet(
  classKey: string,
  lastChangeAtMs?: number
): boolean {
  if (!lastChangeAtMs) return true;
  
  const minInterval = CLASS_MIN_INTERVALS[classKey] ?? 30_000;
  const timeSinceLastChange = Date.now() - lastChangeAtMs;
  
  return timeSinceLastChange >= minInterval;
}