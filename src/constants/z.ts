
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
 * 80  dmSheet      Modal-over-modal scenarios (venue details over favorites)
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

  /* Floq-specific convenience */
  uiBadge: 20,       // tiny "LIVE" pill inside headers
  banner: 30,        // Floq header banners

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

// convenience shorthands for "friend-/gesture-interactive" layers
export const ZFriend = Z.uiInteractive;        // 20
export const ZConstellation = Z.uiControls;    // 21

// floq-specific aliases for common UI patterns
export const ZUIBadge = Z.ui;                  // 20 - tiny live badges
export const ZBanner = Z.overlay;              // 30 - floq header banners

/**
 * Semantic z-index helper.
 * Usage (spread):
 *   <motion.div {...zIndex('overlay')} />
 *   <div {...zIndex('modal', { position: 'sticky' })} />
 *
 * Returns `{ style:{ zIndex } }` so it can be merged with other props
 * without clobbering or leaking a stray `zIndex` HTML attribute.
 */
export function zIndex(
  layer: ZKey,
  extra?: React.CSSProperties,
): { style: React.CSSProperties } {
  return { style: { zIndex: Z[layer], ...extra } };
}
