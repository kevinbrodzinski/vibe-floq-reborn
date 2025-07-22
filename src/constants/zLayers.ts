
/**
 * Z-Index Layer Constants
 * Centralized z-index management for consistent layering
 */

export const Z = {
  // Base layers
  map: 0,
  mapOverlay: 5,
  
  // UI elements
  ui: 10,
  header: 20,
  navigation: 20,
  overlay: 30,
  controls: 15,
  interactive: 15,
  
  // Interactive elements
  modal: 40,
  sheet: 50,
  dmSheet: 50,
  
  // System elements (highest priority)
  system: 60,
  toast: 70,
  debug: 100,
} as const;

export type ZLayer = typeof Z[keyof typeof Z];
