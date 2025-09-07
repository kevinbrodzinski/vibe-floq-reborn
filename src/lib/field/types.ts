// Phase 3 types for flow vectors, convergence lanes, and momentum
export type FlowCell = { x: number; y: number; vx: number; vy: number; mag: number };

export type LaneSegment = {
  id: string;
  a: string; b: string;                         // cluster ids
  pts: Array<{x: number; y: number}>;           // polyline in pixels
  conf: number; etaMs: number;
};

export type MomentumStat = { id: string; speed: number; heading: number };

export type PressureCell = {
  x: number; y: number;        // pixel-space cell center
  p: number;                   // pressure (0..∞), normalized in overlay
  gx: number; gy: number;      // gradient (pixel units)
};

export type StormGroup = {
  id: string;
  x: number; y: number;        // group center (pixel)
  radius: number;              // px
  intensity: number;           // 0..1
  conf: number;                // 0..1
  etaMs: number;               // representative ETA
};

// Re-export existing field types for convenience
export type { SocialCluster, ConvergenceEvent, VibeToken, FieldTile } from '@/types/field';