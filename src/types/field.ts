// Production-ready field types for Phase 1 implementation

export type VibeToken = 'hype' | 'social' | 'chill' | 'flowing' | 'open' | 'curious' | 'solo' | 'romantic' | 'weird' | 'down';

export interface VelocityVector {
  vx: number; // m/s in x direction
  vy: number; // m/s in y direction
  magnitude: number; // speed in m/s
  heading: number; // direction in radians (0 = north)
  confidence: number; // 0-1 based on sample quality
}

export interface TemporalSnapshot {
  timestamp: string;
  crowd_count: number;
  centroid: { lat: number; lng: number };
  vibe: { h: number; s: number; l: number };
}

export interface FieldTile {
  tile_id: string;
  crowd_count: number;
  avg_vibe: {
    h: number;
    s: number;
    l: number;
  };
  active_floq_ids: string[];
  updated_at: string;
  // NO synthetic velocity/momentum from server - computed client-side only
}

export interface EnhancedFieldTile extends FieldTile {
  // Client-side computed physics
  velocity?: VelocityVector;
  movement_mode?: 'stationary' | 'walking' | 'cycling' | 'driving' | 'transit';
  momentum?: number; // 0-1, stability of movement pattern
  cohesion_score?: number; // 0-1, how tightly grouped
  afterglow_intensity?: number; // 0-1, decays over time
  history?: TemporalSnapshot[]; // Keep last 10 snapshots
}

export interface ScreenTile extends EnhancedFieldTile {
  x: number;
  y: number;
  radius: number;
  color: string;
  hsl: {
    h: number;
    s: number;
    l: number;
  };
}

// Phase 1: Social cluster with stable ID and physics
export interface SocialCluster {
  id: string; // stable hash from tile IDs
  x: number;
  y: number;
  r: number;
  count: number;
  vibe: VibeToken;
  ids: string[];
  // Client-computed physics (no intra-batch velocity)
  velocity?: { vx: number; vy: number };
  cohesionScore?: number;
  breathingPhase?: number; // seeded per cluster
  momentum?: number;
}