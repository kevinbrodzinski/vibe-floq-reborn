// Visual-only tokens (colors/sizes). Keep thresholds in constants.ts.

// Enhanced breathing system tokens with improved phase machine
export const breathTokens = {
  // Phase durations in milliseconds
  inhaleMs: 900,
  holdMs: 350, 
  exhaleMs: 900,
  
  // Scale range for breathing effect
  scaleMax: 1.18,
  scaleMin: 0.96,
  
  // Alpha modulation
  alphaBase: 0.55,
  alphaPulse: 0.35,
} as const;

// Glow vocabulary based on cluster energy and cohesion
export const glowVocab = {
  dormant: { alpha: 0.25, halo: 8 },
  awakening: { alpha: 0.35, halo: 12 },
  active: { alpha: 0.45, halo: 16 },
  energized: { alpha: 0.55, halo: 20 },
  peak: { alpha: 0.65, halo: 26 },
  legendary: { alpha: 0.8, halo: 32 },
} as const;

// Lightning effect tokens
export const lightningTokens = {
  triggerConfidence: 0.6,
  triggerEtaMs: 60_000,
  maxAlpha: 0.7,
  fadeInRatio: 0.2, // First 20% of life for fade in
  jitterRange: 60, // Max pixel jitter for segments
  colors: {
    low: 0x4488ff,    // Blue for lower confidence
    high: 0xffffff,   // White for high confidence
  }
} as const;

// Precipitation tokens  
export const precipTokens = {
  intensityThreshold: 0.75,
  spawnRadius: 1.2, // Multiplier of cluster glow radius
  fallSpeed: { min: 80, max: 120 }, // px/s
  dropAlpha: { min: 0.4, max: 0.7 },
  maxDropsPerTier: {
    low: 45,
    mid: 90, 
    high: 150
  }
} as const;
export const flowTokens = {
  arrow: { lengthPx: 22, widthPx: 3, alpha: 0.75 },
  color: { low: '#93c5fd', mid: '#60a5fa', high: '#3b82f6' },
  gridPx: 56,            // vector sampling grid (screen px)
  dashHz: 0.8,           // subtle phase wiggle
} as const;

export const laneTokens = {
  strokePx: 3,
  glowPx: 8,
  dotRadiusPx: 5,
  color: { base: '#fbbf24', strong: '#f59e0b' },
  dashHz: 1.2,
} as const;

export const momentumTokens = {
  badgeSize: 10,
  strokeWidth: 3,
  alpha: 0.9,
  color: '#ffffff',
} as const;

export const pressureTokens = {
  // soft, cool neutrals — adjust via design system later
  color: { low: '#c7d2fe', mid: '#93c5fd', high: '#60a5fa' },
  alpha: 0.6,
  cellRadiusPx: 42,      // base cloud radius
  glowBoost: 1.2,        // optional scale for strong cells
} as const;

export const stormTokens = {
  haloColor: '#fbbf24',  // semantic amber glow
  haloAlpha: 0.85,
  haloRadiusPx: 64,      // base halo radius (scaled by intensity)
  ttlMs: 2200,           // UI fade TTL when stale
} as const;

// Phase 4 visual tokens
export const windTokens = {
  colorLow:  '#93c5fd',
  colorMid:  '#60a5fa',
  colorHigh: '#3b82f6',
  alpha: 0.75,
  widthPx: 3,
  arrowLenPx: 22,
  dashHz: 0.8,
} as const;

export const auroraTokens = {
  colors: ['#a78bfa','#60a5fa','#34d399'], // themed gradients
  alpha: 0.85,
  maxRadiusPx: 180,
  waveHz: 1.2,
} as const;

export const atmoTintTokens = {
  // linear gradient [top,bottom], multiply/mix on top layers
  dawn:   { top:'#fde68a', bottom:'#93c5fd', alpha:0.16 },
  morning:{ top:'#bfdbfe', bottom:'#e0f2fe', alpha:0.14 },
  noon:   { top:'#e5e7eb', bottom:'#bfdbfe', alpha:0.12 },
  dusk:   { top:'#c7d2fe', bottom:'#fca5a5', alpha:0.18 },
  night:  { top:'#111827', bottom:'#1f2937', alpha:0.20 },
} as const;

// Legacy atmospheric tokens (preserved for compatibility)
export const visualTokens = {
  atmo: {
    particleSize: 4,
    glowAlphaBase: 0.35,
    breathingRate: 25, // BPM
    pulseIntensity: 0.5,
  },
} as const;

/**
 * Map cluster properties to glow vocabulary level
 */
export function getGlowLevel(cohesion: number, count: number): keyof typeof glowVocab {
  const energy = cohesion * Math.log10(Math.max(1, count));
  
  if (energy < 0.5) return 'dormant';
  if (energy < 1.0) return 'awakening'; 
  if (energy < 1.8) return 'active';
  if (energy < 2.8) return 'energized';
  if (energy < 4.0) return 'peak';
  return 'legendary';
}

/**
 * Enhanced breathing phase calculation
 */
export type BreathPhase = 'INHALE' | 'HOLD' | 'EXHALE';

export interface BreathState {
  phase: BreathPhase;
  t: number; // Time in current phase (ms)
  scale: number;
  alpha: number;
}

export function stepBreathingPhase(state: BreathState, deltaMs: number): void {
  const T = breathTokens;
  state.t += deltaMs;
  
  const nextPhase = (phase: BreathPhase) => {
    state.phase = phase;
    state.t = 0;
  };
  
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  
  if (state.phase === 'INHALE') {
    const k = Math.min(1, state.t / T.inhaleMs);
    state.scale = lerp(T.scaleMin, T.scaleMax, k);
    state.alpha = T.alphaBase + T.alphaPulse * k;
    if (k >= 1) nextPhase('HOLD');
    
  } else if (state.phase === 'HOLD') {
    state.scale = T.scaleMax;
    state.alpha = T.alphaBase + T.alphaPulse;
    if (state.t >= T.holdMs) nextPhase('EXHALE');
    
  } else { // EXHALE
    const k = Math.min(1, state.t / T.exhaleMs);
    state.scale = lerp(T.scaleMax, T.scaleMin, k);
    state.alpha = T.alphaBase + T.alphaPulse * (1 - k);
    if (k >= 1) nextPhase('INHALE');
  }
}
