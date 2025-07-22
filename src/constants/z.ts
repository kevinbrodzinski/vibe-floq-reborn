
/**
 * ------------------------------------------------------------------
 *  Unified Global Z-Index Scale
 * ------------------------------------------------------------------
 *  Lowest-to-highest layering, semantic names only.
 *
 *          toast      90   (sonner / toaster notifications)
 *          dmSheet    80   (quick-DM sheets, emergency overlays)
 *          modal      70   (all Radix sheets / dialogs / popovers)
 *          navigation 60   (top header + bottom nav)
 *          system     50   (FABs, viewport controls, live regions)
 *          timewarp   40   (time-warp slider & similar)
 *          overlay    30   (banners, field overlay HUD)
 *          ui*        20   (regular page UI, friend carousel, etc.)
 *          mapOverlay 10   (markers, PIXI overlays)
 *          map         0   (Mapbox GL + FieldCanvas)
 *          debug    9999   (dev-only panels)
 *
 *  *Split ui into subkeys for convenience only; values are identical.*
 */

export const Z = {
  // Base map layers
  map: 0,
  mapOverlay: 10,

  // Regular UI
  ui: 20,
  uiHeader: 20,        // FieldHeader, LocationDisplay
  uiControls: 20,      // ConstellationControls, misc buttons
  uiInteractive: 20,   // Friend carousel, gesture mgr
  overlay: 30,

  // Special feature layers
  timewarp: 40,
  system: 50,
  navigation: 60,
  modal: 70,
  dmSheet: 80,
  toast: 90,

  // Development / debug
  debug: 9999,
} as const;

export type ZKey = keyof typeof Z;

/** tiny helper — `<div style={zIndex('modal')}/>` */
export const zIndex = (layer: ZKey): React.CSSProperties =>
  ({ zIndex: Z[layer] });
