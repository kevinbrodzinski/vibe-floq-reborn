export const FIELD_LOD = {
  TRAILS_MIN_ZOOM: 16,
  K_MIN: 5,
  MIN_SPEED: 0.02,       // screen units per ms after scale normalization
  AFTERGLOW_MIN_MS: 2000,
  AFTERGLOW_MAX_MS: 60000,
};

export const PARTICLE = {
  // route through design tokens if you already have size tokens; placeholder constants here
  SIZE_SM: 2,  // replace with token map when available
};

export const CLUSTER = {
  BASE_MERGE_DISTANCE: 42, // px at zoom 11
  MAX_BREATHING_SCALE: 0.18, // 18% scale variation
  BREATHING_FREQUENCY: 0.003, // breathing speed multiplier
};