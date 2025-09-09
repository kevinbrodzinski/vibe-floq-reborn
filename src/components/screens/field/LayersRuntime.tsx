import React from 'react';
import { getCurrentMap } from '@/lib/geo/mapSingleton';
import { useTileVenuesLayer } from '@/map/layers/useTileVenuesLayer';
import { useSocialWeatherLayer } from '@/map/layers/useSocialWeatherLayer';
import type { FieldData } from './FieldDataProvider';

interface LayersRuntimeProps {
  data: FieldData;
}

export function LayersRuntime({ data }: LayersRuntimeProps) {
  const map = getCurrentMap();

  // Mount venues and weather as map layers
  useTileVenuesLayer(map, data.nearbyVenues);
  useSocialWeatherLayer(map, data.weatherCells);

  return null;
}