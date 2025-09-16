import type mapboxgl from 'mapbox-gl';

/** Mapbox paint/layout dictionaries */
type PaintDict  = Record<string, any>;
type LayoutDict = Record<string, any>;

/** Batch spec for multiple layers */
export type LayerColorSpec = Record<string, { paint?: PaintDict; layout?: LayoutDict }>;

/** CSS-variable driven paint spec for single-layer helper */
export type PaintSpec = Record<string, { var: string; fallback: string }>;

/** Resolve an HSL CSS custom property (or return fallback) */
function hslVar(cssVar: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
  return v || fallback;
}

/**
 * Generic helper to apply CSS custom property colors to Mapbox layers
 */
export function applyLayerColors(map: mapboxgl.Map, layerId: string, paint: PaintSpec) {
  if (!map?.isStyleLoaded?.() || !map.getStyle() || !map.getLayer(layerId)) return;
  
  for (const [prop, def] of Object.entries(paint)) {
    const color = hslVar(def.var, def.fallback) || def.fallback;
    try {
      map.setPaintProperty(layerId, prop, color);
    } catch {
      // last resort: white
      map.setPaintProperty(layerId, prop, '#ffffff');
    }
  }
}

export type LayerPaintBatch = Array<{
  id: string;
  paint: PaintSpec;
}>;

/**
 * Apply colors to multiple layers in one call
 */
export function applyColorsBatch(map: mapboxgl.Map, batch: LayerPaintBatch) {
  for (const { id, paint } of batch) {
    applyLayerColors(map, id, paint);
  }
}

/** Returns true if anything was applied */
export function applyLayerColorsAdvanced(
  map: mapboxgl.Map | null | undefined,
  spec: LayerColorSpec
): boolean {
  if (!map?.isStyleLoaded?.() || !map.getStyle()) return false;
  let changed = false;

  for (const [id, cfg] of Object.entries(spec)) {
    if (!map.getLayer(id)) continue;
    if (cfg.paint) {
      for (const [k, v] of Object.entries(cfg.paint)) {
        try { map.setPaintProperty(id, k, v); changed = true; } catch {}
      }
    }
    if (cfg.layout) {
      for (const [k, v] of Object.entries(cfg.layout)) {
        try { map.setLayoutProperty(id, k, v); changed = true; } catch {}
      }
    }
  }
  return changed;
}

/** Apply colors only after style + all target layers exist */
export function applyLayerColorsWhenReady(
  map: mapboxgl.Map,
  spec: LayerColorSpec,
  ids: string[] = Object.keys(spec),
  maxFrames = 60
) {
  const ready = () => map.isStyleLoaded?.() && ids.every(id => !!map.getLayer(id));

  const kick = () => {
    let frames = 0;
    const tick = () => {
      if (ready()) { applyLayerColorsAdvanced(map, spec); return; }
      if (++frames <= maxFrames) requestAnimationFrame(tick);
      else console.warn('[applyLayerColorsWhenReady] layers not found:', ids.filter(id => !map.getLayer(id)));
    };
    requestAnimationFrame(tick);
  };

  if (ready()) applyLayerColorsAdvanced(map, spec);
  else if (map.isStyleLoaded?.()) kick();
  else map.once('idle', kick);
}