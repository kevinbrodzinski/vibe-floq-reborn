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

// Phase 4 types for atmospheric effects
export type PixelPoint = { x: number; y: number };
export type PixelBBox = { xMin:number; yMin:number; xMax:number; yMax:number };

export type WindPath = {
  id: string;
  pts: PixelPoint[];     // polyline in pixel space (Catmull-Rom → Bezier sampled)
  strength: number;      // 0..1
  avgSpeed: number;      // px/ms (smoothed)
  support: number;       // normalized path support (0..1)
};

export type AuroraEventLite = {
  id: string;
  center: PixelPoint;
  radiusPx: number;
  intensity: number;     // 0..1
  hue: number;           // 0..360 (from vibe/arousal)
};

// Re-export existing field types for convenience
export type { SocialCluster, ConvergenceEvent, VibeToken, FieldTile } from '@/types/field';