export const FIELD_LOD = {
  TRAILS_MIN_ZOOM: 16,
  K_MIN: 5,
  MIN_SPEED: 0.02,       // screen units per ms after scale normalization
  AFTERGLOW_MIN_MS: 2000,
  AFTERGLOW_MAX_MS: 60000,
};

export const PARTICLE = {
  SIZE_SM: 2,  // route through design tokens if you already have size tokens; placeholder constants here
};

export const CLUSTER = {
  BASE_MERGE_DISTANCE: 42, // px at zoom 11
  MAX_BREATHING_SCALE: 0.18, // 18% scale variation
  BREATHING_FREQUENCY: 0.003, // radians/ms breathing speed multiplier
};

export const PHASE2 = {
  CONVERGENCE: {
    HORIZON_MS: 5 * 60_000,      // max predicted ETA
    MAX_DIST_PX: 140,            // distance at t* must be under this
    MIN_APPROACH_SPEED: 0.015,   // screen units/ms
    MIN_COHESION: 0.25,          // cluster cohesion floor
    ZOOM_MIN: 14,                // LOD gate for showing signals
    K_MIN: 5,                    // k-anon
    COOL_MS: 2_000,              // hysteresis to avoid flicker
  },
  DEBUG: { VECTORS_MAX: 600 },
};

// Atmosphere and animation constants - thresholds and timing only
export const ATMO = {
  BREATH_ZOOM_MIN: 14,           // Unified LOD gate for all Phase 2 effects
  BREATHING: {
    MIN_ZOOM: 14,                // Same as BREATH_ZOOM_MIN for consistency
    GRID_PX: 150,                // Pixel-space grid for phase sync
  },
  PARTICLE_CAP: 200,             // Max particles across all systems
  CONVERGENCE: {
    MAX_PER_FRAME: 64,
    COOL_MS: 2_000,              // Fade duration for convergence markers
  },
};

// Phase 3 constants (perf/privacy thresholds only)
export const P3 = {
  FLOW: { MIN_ZOOM: 13, MAX_ARROWS: 900, UPDATE_HZ: 8, SMOOTH: 0.65 },
  LANES: { MIN_ZOOM: 15, K_MIN: 5, PROB_MIN: 0.45, ETA_MAX_MS: 300000, MAX_LANES: 64, MAX_DIST_PX: 140 },
  MOMENTUM: { MIN_ZOOM: 16, SPEED_MIN: 0.12 }, // px/ms
} as const;

// Performance budgets (enforced)
export const PERF_BUDGETS = {
  WORKER_MS: 8,          // Max worker time per batch
  RENDER_MS: 7.5,        // P95 render at street zoom  
  DRAW_CALLS: 450,       // Max draw calls
  PARTICLES: {
    LOW: 30,
    MID: 50,
    HIGH: 100
  },
  FLOW_GRID_SIZE: {
    LOW: 96,             // Coarser grid for low-end
    MID: 72,
    HIGH: 48
  }
} as const;