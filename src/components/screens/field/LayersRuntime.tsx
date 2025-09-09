import React, { useEffect, useRef } from 'react';
import { getCurrentMap } from '@/lib/geo/mapSingleton';
import { useTileVenuesLayer } from '@/map/layers/useTileVenuesLayer';
import { useSocialWeatherLayer } from '@/map/layers/useSocialWeatherLayer';
import { createPixiCustomLayer } from '@/lib/map/pixi/PixiCustomLayer';
import { BreathingSystem } from '@/lib/map/pixi/systems/BreathingSystem';
import { LightningSystem } from '@/lib/map/pixi/systems/LightningSystem';
import { brand } from '@/lib/tokens/brand';
import type { FieldData } from './FieldDataProvider';

interface LayersRuntimeProps {
  data: FieldData;
}

export function LayersRuntime({ data }: LayersRuntimeProps) {
  const map = getCurrentMap();
  const pixiLayerRef = useRef<ReturnType<typeof createPixiCustomLayer> | null>(null);

  // Mount venues and weather as map layers
  useTileVenuesLayer(map, data.nearbyVenues);
  useSocialWeatherLayer(map, data.weatherCells);

  // Mount Pixi atmospheric effects layer
  useEffect(() => {
    if (!map || pixiLayerRef.current) return;

    const layerFactory = () => {
      const layer = createPixiCustomLayer({ 
        id: 'pixi-atmosphere', 
        colorHex: brand.accent,
        deviceTier: 'mid'
      });
      
      // Attach atmospheric systems
      layer.attach(new BreathingSystem({ colorHex: brand.primary }));
      layer.attach(new LightningSystem({ 
        colorHex: brand.accent, 
        maxBoltsPerFrame: 1 
      }));
      
      return layer;
    };

    // add now
    const layer = layerFactory();
    try {
      map.addLayer(layer);
      pixiLayerRef.current = layer;
    } catch (error) {
      console.warn('Failed to add Pixi atmospheric layer:', error);
    }

    // re-add after style changes
    const onStyle = () => {
      try {
        const exists = map.getLayer('pixi-atmosphere');
        if (!exists) {
          const repl = layerFactory();
          map.addLayer(repl);
          pixiLayerRef.current = repl;
          // push latest cells back in (if we have them)
          if (data.weatherCells?.length) {
            const zoom = map.getZoom?.() ?? 14;
            repl.updateCells(data.weatherCells, zoom);
          }
        }
      } catch (e) {
        console.warn('Pixi reattach failed:', e);
      }
    };
    map.on('style.load', onStyle);

    return () => {
      map.off('style.load', onStyle);
      if (pixiLayerRef.current) {
        try {
          map.removeLayer(pixiLayerRef.current.id);
        } catch (error) {
          console.warn('Failed to remove Pixi layer:', error);
        }
        pixiLayerRef.current = null;
      }
    };
  }, [map]);

  // Update atmospheric effects with weather data
  useEffect(() => {
    if (!pixiLayerRef.current || !data.weatherCells) return;
    
    const zoom = map?.getZoom?.() ?? 14;
    pixiLayerRef.current.updateCells(data.weatherCells, zoom);
  }, [data.weatherCells, map]);

  return null;
}