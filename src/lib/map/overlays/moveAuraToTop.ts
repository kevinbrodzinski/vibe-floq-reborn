import type mapboxgl from 'mapbox-gl';
import { moveLayerSafe } from '../layers/utils';
import { 
  LYR_USER_AURA_OUTER, 
  LYR_USER_AURA_INNER, 
  LYR_USER_AURA_DOT 
} from '../ids';

/**
 * Utility to ensure aura layers stay on top of all other layers
 * Uses the new safe layer utilities to prevent race conditions
 */
export function moveAuraToTop(map: mapboxgl.Map) {
  if (!map || !map.isStyleLoaded()) return;
  
  const auraLayerIds = [
    LYR_USER_AURA_OUTER, 
    LYR_USER_AURA_INNER, 
    LYR_USER_AURA_DOT
  ];
  
  const layers = map.getStyle()?.layers ?? [];
  const topId = layers[layers.length - 1]?.id;
  
  if (!topId) return; // No layers exist yet
  
  // Use safe layer utilities - no more race conditions
  auraLayerIds.forEach(id => {
    moveLayerSafe(map, id, topId);
  });
}