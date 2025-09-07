import { useMemo } from 'react';
import { useFieldTiles } from './useFieldTiles';
import type { EnhancedFieldTile } from '@/types/field';

interface TileBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  precision?: number;
}

/**
 * Enhanced field tiles with factual data only
 * NO velocity computation here - velocity computed at cluster level
 */
export function useEnhancedFieldTiles(bounds?: TileBounds) {
  const { data: tiles, ...rest } = useFieldTiles(bounds);

  const enhancedTiles = useMemo(() => {
    if (!tiles) return undefined;
    
    return tiles.map((tile): EnhancedFieldTile => {
      let enhanced: EnhancedFieldTile = { ...tile };
      
      // No velocity here in Phase-1 (keep factual). Afterglow intensity only:
      const now = Date.now();
      const age = now - new Date(tile.updated_at).getTime();
      enhanced.afterglow_intensity = Math.max(0, 1 - (age / 60000));
      
      return enhanced;
    });
  }, [tiles]);

  return {
    ...rest,
    data: enhancedTiles
  };
}