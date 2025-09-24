/**
 * Vibe Token Classifier
 * Converts continuous { valence, arousal } into discrete VibeToken for consistent colors
 */

import type { VibeToken } from '@/types/field';

export type VibeState = { 
  valence: number;    // -1..1 (negative to positive)
  arousal: number;    // 0..1 (calm to energetic)
  dominance?: number; // 0..1 (optional: submissive to dominant)
  confidence?: number; // 0..1 (optional: confidence in classification)
};

type Region = { 
  t: VibeToken; 
  cx: number; // center valence
  cy: number; // center arousal
  w: number;  // width in valence dimension
  h: number;  // height in arousal dimension
};

// Rectangle/Gaussian regions in (valence, arousal) space
// Tuned for social context mapping
const REGIONS: Region[] = [
  { t: 'hype',     cx: +0.6, cy: 0.85, w: 0.8, h: 0.4 },
  { t: 'social',   cx: +0.5, cy: 0.65, w: 0.9, h: 0.5 },
  { t: 'flowing',  cx: +0.2, cy: 0.6,  w: 1.0, h: 0.6 },
  { t: 'open',     cx: +0.2, cy: 0.4,  w: 1.0, h: 0.6 },
  { t: 'chill',    cx: +0.1, cy: 0.2,  w: 1.0, h: 0.6 },
  { t: 'romantic', cx: +0.4, cy: 0.55, w: 0.8, h: 0.5 },
  { t: 'curious',  cx:  0.0, cy: 0.55, w: 0.9, h: 0.6 },
  { t: 'weird',    cx: -0.3, cy: 0.65, w: 0.9, h: 0.6 },
  { t: 'solo',     cx: -0.2, cy: 0.25, w: 0.9, h: 0.6 },
  { t: 'down',     cx: -0.5, cy: 0.25, w: 0.8, h: 0.5 },
];

/**
 * Elliptical distance score for region matching
 */
function score(v: VibeState, r: Region): number {
  const dx = (v.valence - r.cx) / (r.w / 2);
  const dy = (v.arousal - r.cy) / (r.h / 2);
  const d2 = dx * dx + dy * dy;
  return Math.exp(-d2); // 0..1
}

/**
 * Classify continuous vibe state into discrete token
 */
export function classifyVibeToken(v: VibeState, fallback: VibeToken = 'social'): VibeToken {
  if (!Number.isFinite(v.valence) || !Number.isFinite(v.arousal)) {
    return fallback;
  }
  
  let best = fallback;
  let maxScore = -1;
  
  for (const region of REGIONS) {
    const regionScore = score(v, region);
    if (regionScore > maxScore) {
      maxScore = regionScore;
      best = region.t;
    }
  }
  
  return best;
}

/**
 * Get multiple candidates with confidence scores
 */
export function classifyVibeWithConfidence(v: VibeState): Array<{ token: VibeToken; confidence: number }> {
  const results = REGIONS.map(region => ({
    token: region.t,
    confidence: score(v, region)
  }));
  
  return results
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3); // Top 3 candidates
}

/**
 * Smooth vibe transitions with temporal consistency
 */
export class VibeClassifierSmooth {
  private history: { token: VibeToken; confidence: number; timestamp: number }[] = [];
  private maxHistoryMs = 5000; // 5 second smoothing window
  
  classify(v: VibeState): VibeToken {
    const now = performance.now();
    const candidates = classifyVibeWithConfidence(v);
    const topToken = candidates[0]?.token ?? 'social';
    
    // Add to history
    this.history.push({
      token: topToken,
      confidence: candidates[0]?.confidence ?? 0,
      timestamp: now
    });
    
    // Clean old history
    this.history = this.history.filter(h => now - h.timestamp < this.maxHistoryMs);
    
    // Weight recent classifications more heavily
    const tokenWeights = new Map<VibeToken, number>();
    let totalWeight = 0;
    
    for (const h of this.history) {
      const age = now - h.timestamp;
      const timeWeight = Math.exp(-age / this.maxHistoryMs); // Exponential decay
      const weight = h.confidence * timeWeight;
      
      tokenWeights.set(h.token, (tokenWeights.get(h.token) ?? 0) + weight);
      totalWeight += weight;
    }
    
    // Find most weighted token
    let bestToken = topToken;
    let bestWeight = 0;
    
    for (const [token, weight] of tokenWeights) {
      const normalizedWeight = weight / totalWeight;
      if (normalizedWeight > bestWeight) {
        bestWeight = normalizedWeight;
        bestToken = token;
      }
    }
    
    return bestToken;
  }
  
  getConfidence(): number {
    if (this.history.length === 0) return 0;
    
    // Average confidence over recent history
    const recentHistory = this.history.slice(-5); // Last 5 classifications
    return recentHistory.reduce((sum, h) => sum + h.confidence, 0) / recentHistory.length;
  }
}

/**
 * Convert from common emotion models
 */
export function fromCircumplex(valence: number, arousal: number): VibeState {
  return { valence, arousal };
}

export function fromPAD(pleasure: number, arousal: number, dominance: number): VibeState {
  return { 
    valence: pleasure, 
    arousal, 
    dominance 
  };
}