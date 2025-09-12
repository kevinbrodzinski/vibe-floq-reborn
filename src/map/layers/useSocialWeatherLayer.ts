import * as React from 'react';
import { layerManager } from '@/lib/map/LayerManager';
import { createSocialWeatherSpec, socialWeatherToFC } from '@/lib/map/overlays/socialWeatherSpec';
import type { PressureCell } from '@/lib/api/mapContracts';

export function useSocialWeatherLayer(map: any, cells?: PressureCell[]) {
  // Register the social weather spec once when map is available
  React.useEffect(() => {
    if (!map) return;
    layerManager.register(createSocialWeatherSpec());
    return () => layerManager.unregister('social-weather');
  }, [map]);

  // Apply weather data whenever it changes
  React.useEffect(() => {
    if (!cells) return;
    const fc = socialWeatherToFC(cells);
    layerManager.apply('social-weather', fc);
  }, [cells]);
}