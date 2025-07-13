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
  header: 11,        // Z.ui + 1
  overlay: 12,       // Z.ui + 2
  controls: 13,      // Z.ui + 3
  interactive: 14,   // Z.ui + 4
  timewarp: 31,      // Z.ui + 21 - TimeWarp glass pane
  
  // Modal layers  
  modal: 40,
  
  // System overlays
  system: 50,
  
  // Navigation (highest - always accessible)
  navigation: 60,
} as const;

export type ZLayer = typeof Z[keyof typeof Z];