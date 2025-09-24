// Domain types for enhanced field tiles - safe from codegen overwriting

export interface VelocityVector {
  vx: number; // m/s in x direction (east positive)
  vy: number; // m/s in y direction (north positive)  
  magnitude: number; // speed in m/s
  heading: number; // direction in radians (0 = north, clockwise positive)
  confidence: number; // 0-1 based on sample quality
}

export interface TemporalSnapshot {
  timestamp: string;
  crowd_count: number;
  centroid: { lat: number; lng: number };
  vibe: {
    h: number; // hue 0-360
    s: number; // saturation 0-100  
    l: number; // lightness 0-100
  };
}

export type MovementMode = 'stationary' | 'walking' | 'cycling' | 'driving' | 'transit';

export interface ConvergenceVector {
  target_tile_id: string;
  time_to_converge: number; // seconds
  probability: number; // 0-1
}

export interface EnhancedFieldTile {
  tile_id: string;
  crowd_count: number;
  avg_vibe: {
    h: number;
    s: number;
    l: number;
  };
  active_floq_ids: string[];
  updated_at: string;
  center?: [number, number]; // [lng, lat] - H3 centroid from server
  
  // Client-side physics (k-anon may remove for small crowds)
  velocity?: VelocityVector;
  movement_mode?: MovementMode;
  momentum?: number; // 0-1, stability of movement pattern
  cohesion_score?: number; // 0-1, how tightly grouped
  afterglow_intensity?: number; // 0-1, decays over time
  history?: TemporalSnapshot[]; // Keep last 10 snapshots
  
  // Convergence prediction
  convergence_vector?: ConvergenceVector | null;
  
  // Trail segments for rendering (managed by PIXI system)
  trail_segments?: Array<{
    x: number;
    y: number;
    timestamp: number;
    alpha: number;
  }>;
}

export interface EnhancedFieldTilesResponse {
  tiles: EnhancedFieldTile[];
  convergences?: Array<{
    id: string;
    tileA: string;
    tileB: string;
    meetingPoint: { lat: number; lng: number };
    timeToMeet: number;
    probability: number;
  }>;
}