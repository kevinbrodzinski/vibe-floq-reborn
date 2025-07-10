/**
 * Z-index layer definitions for consistent stacking order
 * All components should reference these constants instead of using naked numbers
 */
export const Z = {
  // Base layers (inside map container)
  map: 0,
  people: 10,
  
  // UI overlays (can stay in main tree)
  miniMap: 15,
  
  // Transient surfaces (should use portal)
  banner: 20,
  sheet: 30,
  toast: 40,
  
  // Debug overlay (highest)
  debug: 50
} as const;

export type ZIndex = typeof Z[keyof typeof Z];