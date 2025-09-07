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
  center?: [number, number]; // [lng, lat] - real H3 centroid from server
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

// Phase 2: Enhanced social cluster with breathing and lifecycle
export interface SocialCluster {
  id: string; // stable hash from tile IDs
  x: number;
  y: number;
  r: number;
  count: number;
  vibe: VibeToken;
  
  // Phase 2: Social Physics Properties
  cohesionScore?: number;           // 0-1, spatial + vibe tightness
  breathingPhase?: number;          // 0-2π, current phase in cycle
  breathingRate?: number;           // breaths per minute (20-40 BPM)
  energyLevel?: number;             // 0-1, activity intensity
  momentum?: number;                // 0-1, movement consistency
  lifecycleStage?: 'forming' | 'stable' | 'peaking' | 'dispersing';
  socialGravity?: number;           // 0-1, attraction to other clusters
  pulseIntensity?: number;          // 0-1, breathing amplitude
  glowRadius?: number;              // pixels, visual glow size
  formationTime?: number;           // timestamp when cluster formed
  
  // Client-computed physics
  velocity?: { vx: number; vy: number };
  convergenceTargets?: Array<{
    targetId: string;
    timeToMeet: number;
    probability: number;
  }>;
}

// Phase 2: Convergence prediction
export interface ConvergenceEvent {
  id: string;                    // deterministic from pair ids
  a: string; b: string;          // cluster ids (not exposed in UI copies if you prefer)
  meeting: { x: number; y: number };
  etaMs: number;                 // time-to-meet
  dStar: number;                 // distance at closest approach
  confidence: number;            // 0..1
}

export interface CentroidState {
  x: number; 
  y: number; 
  vx: number; 
  vy: number; 
  t: number; 
  cohesion: number; 
  k: number;
}