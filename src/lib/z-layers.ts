
/**
 * @deprecated Use Z from '@/constants/z' instead  
 * This file is kept for backward compatibility during migration
 */
export { Z } from '@/constants/z';

// Legacy exports for compatibility
export const Z_LAYERS = {
  MAP: 0,
  UI: 20,
  MODAL: 70,
  SYSTEM: 50,
} as const;

export const Z_LAYERS_DETAILED = {
  MAP_CANVAS: 0,
  MAP_OVERLAYS: 10,
  PEOPLE_DOTS: 20,
  CONSTELLATION: 20,
  MINI_MAP: 20,
  FIELD_HEADER: 20,
  FIELD_OVERLAY: 30,
  FLOATING_BUTTONS: 50,
  VENUES_CHIP: 20,
  TIME_WARP: 40,
  BANNERS: 30,
  HOVER_CARDS: 20,
  SHEETS: 70,
  DIALOGS: 70,
  TOASTS: 90,
  LOADING: 90,
  DEBUG: 9999
} as const;

export type ZLayer = typeof Z_LAYERS[keyof typeof Z_LAYERS];
export const zIndex = (layer: ZLayer) => ({ zIndex: layer });
export const Z_CSS_VARS = {
  '--z-map': Z_LAYERS.MAP,
  '--z-ui': Z_LAYERS.UI,
  '--z-modal': Z_LAYERS.MODAL,
  '--z-system': Z_LAYERS.SYSTEM,
} as const;
