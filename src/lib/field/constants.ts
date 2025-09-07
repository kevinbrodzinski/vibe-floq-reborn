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

// Atmosphere and animation tokens - unified with breathing system
export const ATMO = {
  BREATH_ZOOM_MIN: 14,           // Unified LOD gate for all Phase 2 effects
  BREATHING: {
    MIN_ZOOM: 14,                // Same as BREATH_ZOOM_MIN for consistency
    GRID_PX: 150,                // Pixel-space grid for phase sync
  },
  GLOW_ALPHA_BASE: 0.3,
  PARTICLE_SIZE: 2,
  PARTICLE_CAP: 200,             // Max particles across all systems
  CONVERGENCE: {
    MAX_PER_FRAME: 64,
    COOL_MS: 2_000,              // Fade duration for convergence markers
  },
};