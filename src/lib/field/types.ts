// Phase 3 types for flow vectors, convergence lanes, and momentum
export type FlowCell = { x: number; y: number; vx: number; vy: number; mag: number };

export type LaneSegment = {
  id: string;
  a: string; b: string;                         // cluster ids
  pts: Array<{x: number; y: number}>;           // polyline in pixels
  conf: number; etaMs: number;
};

export type MomentumStat = { id: string; speed: number; heading: number };

// Re-export existing field types for convenience
export type { SocialCluster, ConvergenceEvent, VibeToken, FieldTile } from '@/types/field';