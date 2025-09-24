// src/lib/map/pixi/flags.ts
// Dev toggles for Pixi atmospheric effects

export const PIXI_ENABLED =
  (typeof window !== 'undefined' &&
   new URLSearchParams(window.location.search).get('pixi') !== 'off') &&
  (import.meta.env.VITE_PIXI_ENABLED ?? 'true') !== 'false';

export const PIXI_DEBUG = 
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).has('pixi_debug');