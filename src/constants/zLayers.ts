/**
 * Centralized Z-Index Layer Management
 * 
 * Creates a deterministic stacking order for all UI elements.
 * Never use raw z-index values - always reference this enum.
 */

export const Z = {
  // Base map layers
  map: 0,
  
  // UI overlays
  ui: 10,
  
  // Modal layers  
  modal: 40,
  
  // System overlays (highest)
  system: 50,
} as const;

export type ZLayer = typeof Z[keyof typeof Z];