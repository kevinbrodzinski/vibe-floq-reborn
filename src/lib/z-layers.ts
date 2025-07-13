/**
 * Centralized Z-Index Layer Management
 * 
 * Creates a deterministic stacking order for all UI elements.
 * Never use raw z-index values - always reference this enum.
 */

export const Z_LAYERS = {
  // Base map layers
  MAP: 0,
  
  // UI overlays
  UI: 10,
  
  // Modal layers  
  MODAL: 40,
  
  // System overlays (highest)
  SYSTEM: 50,
} as const;

// Detailed constants for specific use cases
export const Z_LAYERS_DETAILED = {
  // Base map layers
  MAP_CANVAS: 0,
  MAP_OVERLAYS: 5,
  
  // People and presence
  PEOPLE_DOTS: 10,
  CONSTELLATION: 15,
  
  // UI overlays  
  MINI_MAP: 20,
  FIELD_HEADER: 25,
  FIELD_OVERLAY: 30,
  
  // Action elements
  FLOATING_BUTTONS: 35,
  VENUES_CHIP: 40,
  TIME_WARP: 45,
  
  // Interactive elements
  BANNERS: 50,
  HOVER_CARDS: 55,
  
  // Modal layers
  SHEETS: 60,
  DIALOGS: 65,
  
  // System overlays
  TOASTS: 70,
  LOADING: 75,
  
  // Debug overlays (highest)
  DEBUG: 100
} as const;

export type ZLayer = typeof Z_LAYERS[keyof typeof Z_LAYERS];

/**
 * Helper to get z-index style object
 */
export const zIndex = (layer: ZLayer) => ({ zIndex: layer });

/**
 * CSS custom properties for consistent z-index usage
 */
export const Z_CSS_VARS = {
  '--z-map': Z_LAYERS.MAP,
  '--z-ui': Z_LAYERS.UI,
  '--z-modal': Z_LAYERS.MODAL,
  '--z-system': Z_LAYERS.SYSTEM,
} as const;