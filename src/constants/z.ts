
/**
 * Unified Global Z-Index Scale
 * ───────────────────────────
 * 0   map           Base Map & WebGL canvas
 * 10  mapOverlay   Map markers / heat-sprites
 * 20  uiInteractive Carousels, gesture layers
 * 21  uiControls   Constellation controls, FABs
 * 22  uiHeader     Field header, location banner
 * 30  overlay      Banners & field overlay
 * 40  timewarp     Time-warp slider
 * 50  system       Live-regions, viewport helpers
 * 60  navigation   Top header & bottom nav
 * 70  modal        Sheets, dialogs, pop-overs
 * 80  dmSheet      DM quick-sheet (urgent overlay)
 * 90  toast        Toasts & notifications
 * 9999 debug       Dev-only debug panels
 */
export const Z = {
  map: 0,
  mapOverlay: 10,

  ui: 20,
  uiHeader: 20,      // alias
  uiControls: 20,    // alias  
  uiInteractive: 20, // alias
  overlay: 30,

  timewarp: 40,
  system: 50,
  navigation: 60,
  modal: 70,
  dmSheet: 80,
  toast: 90,

  debug: 9999,
} as const;

export type ZKey = keyof typeof Z;

/** Usage: `<div {...zIndex('modal')}>…` */
export const zIndex = (layer: ZKey) => ({ style: { zIndex: Z[layer] } });
