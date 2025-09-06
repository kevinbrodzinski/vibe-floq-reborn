
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
  // Phase 1: Velocity and temporal data
  velocity?: {
    vx: number;
    vy: number;
  };
  momentum?: number;
  last_positions?: Array<{
    x: number;
    y: number;
    timestamp: number;
  }>;
}

export interface ScreenTile extends FieldTile {
  x: number;
  y: number;
  radius: number;
  color: string;
  hsl: {
    h: number;
    s: number;
    l: number;
  };
  // Phase 1: Screen-space physics
  trail?: Array<{
    x: number;
    y: number;
    alpha: number;
    timestamp: number;
  }>;
}

// Phase 1: Social cluster with physics
export interface SocialCluster {
  x: number;
  y: number;
  r: number;
  count: number;
  vibe: { h: number; s: number; l: number };
  ids: string[];
  // Social physics properties
  velocity: { vx: number; vy: number };
  cohesionScore: number;
  breathingPhase: number;
  momentum: number;
}
