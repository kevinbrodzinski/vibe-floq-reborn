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
    map.setPaintProperty(layerId, prop, hslVar(def.var, def.fallback));
  }
}