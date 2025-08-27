/**
 * Policy Ladder - Core decision engine for all state changes
 * Enforces θ/ω confidence gates, min-interval timing, hysteresis, and venue safety
 */

export type PolicyInput = {
  claim: {
    kind: 'label' | 'band' | 'raw';
    value: string | number;
    confidence?: number;
  };
  theta: number; // confidence threshold
  omega: number; // uncertainty bandwidth threshold  
  class: 'presence' | 'checkin' | 'planning' | 'ranking' | 'group';
  lastChangeAt?: Date;
  venueSafety?: 'safe' | 'sensitive' | 'unknown';
  userId?: string;
};

export type PolicyDecision = {
  allowed: boolean;
  reason?: string;
  redactionLevel?: 'label_only' | 'banded' | 'raw';
  observability: {
    min_interval_enforced: boolean;
    hysteresis_applied: boolean;
    theta_passed: boolean;
    omega_passed: boolean;
    venue_safety_passed: boolean;
  };
};

// Class-specific minimum intervals (ms)
const MIN_INTERVALS = {
  presence: 30000,    // 30s
  checkin: 120000,    // 2min
  planning: 300000,   // 5min
  ranking: 60000,     // 1min
  group: 180000,      // 3min
} as const;

// Hysteresis buffer (ms) to prevent rapid state changes
const HYSTERESIS_BUFFER = 10000; // 10s

/**
 * Core policy ladder evaluation
 * Returns decision with observability metadata
 */
export function evaluatePolicyLadder(input: PolicyInput): PolicyDecision {
  const observability = {
    min_interval_enforced: false,
    hysteresis_applied: false,
    theta_passed: false,
    omega_passed: false,
    venue_safety_passed: false,
  };

  // Step 1: Confidence threshold (θ)
  const confidence = input.claim.confidence ?? 1.0;
  observability.theta_passed = confidence >= input.theta;
  
  if (!observability.theta_passed) {
    return {
      allowed: false,
      reason: `Confidence ${confidence} below threshold ${input.theta}`,
      redactionLevel: 'label_only',
      observability,
    };
  }

  // Step 2: Uncertainty bandwidth (ω) - simplified implementation
  // In full implementation, this would use quantile forecasts
  const uncertainty = Math.abs(1.0 - confidence);
  observability.omega_passed = uncertainty <= input.omega;
  
  if (!observability.omega_passed) {
    return {
      allowed: false,
      reason: `Uncertainty ${uncertainty} exceeds threshold ${input.omega}`,
      redactionLevel: 'banded',
      observability,
    };
  }

  // Step 3: Min-interval enforcement
  const minInterval = MIN_INTERVALS[input.class];
  const now = new Date();
  
  if (input.lastChangeAt) {
    const timeSinceLastChange = now.getTime() - input.lastChangeAt.getTime();
    observability.min_interval_enforced = timeSinceLastChange < minInterval;
    
    if (observability.min_interval_enforced) {
      return {
        allowed: false,
        reason: `Min interval ${minInterval}ms not met (${timeSinceLastChange}ms since last change)`,
        redactionLevel: 'banded',
        observability,
      };
    }
  }

  // Step 4: Hysteresis check (prevent rapid oscillation)
  if (input.lastChangeAt) {
    const timeSinceLastChange = now.getTime() - input.lastChangeAt.getTime();
    observability.hysteresis_applied = timeSinceLastChange < HYSTERESIS_BUFFER;
    
    if (observability.hysteresis_applied && confidence < input.theta + 0.1) {
      return {
        allowed: false,
        reason: `Hysteresis buffer active, confidence too close to threshold`,
        redactionLevel: 'banded',
        observability,
      };
    }
  }

  // Step 5: Venue safety check
  observability.venue_safety_passed = input.venueSafety !== 'sensitive';
  
  if (!observability.venue_safety_passed) {
    return {
      allowed: false,
      reason: 'Sensitive venue - action suppressed',
      redactionLevel: 'label_only',
      observability,
    };
  }

  // All gates passed
  return {
    allowed: true,
    redactionLevel: 'raw',
    observability,
  };
}

/**
 * Get min interval for a given class
 */
export function getMinInterval(classType: PolicyInput['class']): number {
  return MIN_INTERVALS[classType];
}

/**
 * Check if enough time has passed since last change
 */
export function isMinIntervalMet(
  classType: PolicyInput['class'],
  lastChangeAt?: Date
): boolean {
  if (!lastChangeAt) return true;
  
  const minInterval = MIN_INTERVALS[classType];
  const timeSinceLastChange = Date.now() - lastChangeAt.getTime();
  
  return timeSinceLastChange >= minInterval;
}