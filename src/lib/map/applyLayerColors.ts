import type mapboxgl from 'mapbox-gl';
import { hslVar } from './themeColor';

export type PaintSpec = Record<
  string,
  { var: `--${string}`; fallback: string }
>;

/**
 * Generic helper to apply CSS custom property colors to Mapbox layers
 */
export function applyLayerColors(map: mapboxgl.Map, layerId: string, paint: PaintSpec) {
  if (!map.getLayer(layerId)) return;
  
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