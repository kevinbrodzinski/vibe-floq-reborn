
/**
 * Unified Global Z-Index Scale
 * 
 * Higher numbers appear on top. Use these constants instead of hardcoded values.
 * 
 * Production Layers:
 * - toast      (90): Toasts, tooltips, notifications
 * - dmSheet    (80): DM quick sheets, urgent overlays  
 * - modal      (70): Sheets, dialogs, popovers
 * - navigation (60): Top header + bottom navigation
 * - system     (50): FABs, viewport controls, live regions
 * - timewarp   (40): TimeWarp slider & similar controls
 * - overlay    (30): Banners, field overlays
 * - ui         (20): Normal page UI elements
 * - mapOverlay (10): Map markers, PIXI canvas overlays
 * - map         (0): Base map & field canvas
 * - debug    (9999): Development-only debug panels
 */
export const Z = {
  // Base layers
  map: 0,
  mapOverlay: 10,
  
  // UI layers (fine-grained)
  uiInteractive: 20, // carousels, gestures, etc.
  uiControls: 21,    // Constellation controls, bottom FABs
  uiHeader: 22,      // Field header + location banner
  overlay: 30,
  timewarp: 40,
  system: 50,
  
  // Global layers
  navigation: 60,
  modal: 70,
  dmSheet: 80,
  toast: 90,
  
  // Development
  debug: 9999,
} as const;

export type ZKey = keyof typeof Z;

/**
 * Helper to get z-index style object
 */
export const zIndex = (layer: keyof typeof Z) => ({ zIndex: Z[layer] });
