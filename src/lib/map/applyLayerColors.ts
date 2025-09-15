import type mapboxgl from 'mapbox-gl';
import { hslVar } from './themeColor';

type PaintSpec = Record<string, { var: string; fallback: string }>;

/**
 * Generic helper to apply CSS custom property colors to Mapbox layers
 */
export function applyLayerColors(map: mapboxgl.Map, layerId: string, paint: PaintSpec) {
  if (!map.getLayer(layerId)) return;
  
  Object.entries(paint).forEach(([prop, def]) => {
    map.setPaintProperty(layerId, prop, hslVar(def.var, def.fallback));
  });
}