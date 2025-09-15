/* eslint-disable @typescript-eslint/no-explicit-any */
import type mapboxgl from 'mapbox-gl';

// Reuse the same IDs you used in userAuraSpec
const SRC_ID = 'user-aura-src';
const LAYER_ID_OUTER = 'user-aura-outer';
const LAYER_ID_INNER = 'user-aura-inner';
const LAYER_ID_DOT   = 'user-aura-dot';

// A tiny state holder to safely restore paint props even with overlapping triggers
let lastToken = 0;
let revertTimer: number | null = null;

// Parse rgba(..) and color expressions → {r,g,b,a}
function parseRgba(c: any): { r: number; g: number; b: number; a: number } | null {
  if (typeof c === 'string') {
    const m = c.match(/rgba?\(([^)]+)\)/i);
    if (!m) return null;
    const parts = m[1].split(',').map(s => s.trim());
    const [r, g, b, a] = parts.map(Number);
    return { r, g, b, a: parts.length === 4 ? a : 1 };
  }
  if (Array.isArray(c) && (c[0] === 'rgba' || c[0] === 'rgb')) {
    const [_, r, g, b, a] = c;
    return { r, g, b, a: c[0] === 'rgba' ? a ?? 1 : 1 };
  }
  return null;
}
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const makeRgba = (r:number,g:number,b:number,a:number) => `rgba(${r},${g},${b},${clamp01(a)})`;

// Get cached user coordinates (no private API access)
function getUserLngLat(): [number, number] | null {
  // Import lastPoint from userAuraSpec module
  return (globalThis as any).__floq_lastPoint || null;
}

/**
 * Briefly emphasize the user aura and recenter the map.
 * - No pulse; just an elegant, short emphasis.
 * - Restores original paint properties after `durationMs`.
 */
export async function recenterAndHighlight(
  map: mapboxgl.Map,
  opts: {
    durationMs?: number;        // total highlight time
    easeMs?: number;            // pan to center duration
    innerBumpPx?: number;       // radius bump for inner ring
    outerBumpPx?: number;       // radius bump for outer ring
    alphaBoost?: number;        // add to current alpha (0..1)
    keepZoom?: boolean;         // true = do not change zoom
  } = {}
) {
  if (!map || !map.getStyle()) return;
  const token = ++lastToken;

  const {
    durationMs = 1000,
    easeMs     = 450,
    innerBumpPx = 10,
    outerBumpPx = 16,
    alphaBoost  = 0.25,
    keepZoom    = true,
  } = opts;

  // If style not ready, wait for idle then re-run
  if (!map.isStyleLoaded()) {
    map.once('idle', () => recenterAndHighlight(map, opts));
    return;
  }

  // We need all three layers present
  if (!map.getLayer(LAYER_ID_INNER) || !map.getLayer(LAYER_ID_OUTER) || !map.getSource(SRC_ID)) {
    return;
  }

  // 1) Recenter on the aura point
  const coord = getUserLngLat();
  if (coord) {
    const center = { center: coord as [number, number], duration: easeMs };
    keepZoom ? map.easeTo(center) : map.easeTo({ ...center, zoom: Math.max(map.getZoom(), 15) });
  }

  // 2) Snapshot current paint props
  const prev = {
    innerRadius: map.getPaintProperty(LAYER_ID_INNER, 'circle-radius'),
    innerColor : map.getPaintProperty(LAYER_ID_INNER, 'circle-color'),
    outerRadius: map.getPaintProperty(LAYER_ID_OUTER, 'circle-radius'),
    outerColor : map.getPaintProperty(LAYER_ID_OUTER, 'circle-color'),
  };

  // 3) Build bumped radii via expressions (prev + constant)
  const bumpExpr = (base: any, bump: number) => ['+', base ?? 0, bump];

  // 4) Bump alphas (colors are rgba)
  const bumpAlpha = (c: any, add: number) => {
    const rgba = parseRgba(c);
    if (!rgba) return c;
    return makeRgba(rgba.r, rgba.g, rgba.b, clamp01(rgba.a + add));
  };

  try {
    // Apply emphasis
    map.setPaintProperty(LAYER_ID_INNER, 'circle-radius', bumpExpr(prev.innerRadius, innerBumpPx));
    map.setPaintProperty(LAYER_ID_OUTER, 'circle-radius', bumpExpr(prev.outerRadius, outerBumpPx));
    if (prev.innerColor) map.setPaintProperty(LAYER_ID_INNER, 'circle-color', bumpAlpha(prev.innerColor, alphaBoost));
    if (prev.outerColor) map.setPaintProperty(LAYER_ID_OUTER, 'circle-color', bumpAlpha(prev.outerColor, alphaBoost));
  } catch {
    // If anything fails (e.g., layer removed during style change), bail quietly
    return;
  }

  // 5) Schedule safe restore (cancel any previous)
  if (revertTimer != null) { clearTimeout(revertTimer); revertTimer = null; }
  revertTimer = window.setTimeout(() => {
    // If a newer highlight has started, don't restore the older snapshot
    if (token !== lastToken) return;
    try {
      map.setPaintProperty(LAYER_ID_INNER, 'circle-radius', prev.innerRadius);
      map.setPaintProperty(LAYER_ID_OUTER, 'circle-radius', prev.outerRadius);
      if (prev.innerColor) map.setPaintProperty(LAYER_ID_INNER, 'circle-color', prev.innerColor);
      if (prev.outerColor) map.setPaintProperty(LAYER_ID_OUTER, 'circle-color', prev.outerColor);
    } catch { /* noop */ }
  }, durationMs);
}

/**
 * Optionally wire this to a GeolocateControl to auto-highlight on 'geolocate'
 */
export function attachAuraHighlightToGeolocate(map: mapboxgl.Map, control?: any) {
  const srcHandler = () => recenterAndHighlight(map);
  // If you handed us the control instance
  if (control && typeof control.on === 'function') {
    control.on('geolocate', srcHandler);
    return () => control.off('geolocate', srcHandler);
  }
  // Fallback: listen to custom 'geolocate' events you dispatch in your UI
  const handler = () => recenterAndHighlight(map);
  window.addEventListener('floq:geolocate', handler as any);
  return () => window.removeEventListener('floq:geolocate', handler as any);
}