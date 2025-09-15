import React from 'react';
import { getCurrentMap } from '@/lib/geo/mapSingleton';
import { useLayerManager } from '@/hooks/useLayerManager';
import { useNavDestination } from '@/hooks/useNavDestination';
import { useTileVenuesLayer } from '@/map/layers/useTileVenuesLayer';
import { useSocialWeatherLayer } from '@/map/layers/useSocialWeatherLayer';
import { PredictedMeetingPointsLayer } from '@/map/layers/PredictedMeetingPointsLayer';
import { BreadcrumbMapLayer } from '@/components/map/BreadcrumbMapLayer';
import { UserAuraOverlay } from '@/components/map/UserAuraOverlay';
import { layerManager } from '@/lib/map/LayerManager';
import type { FieldData } from './FieldDataProvider';

interface LayersRuntimeProps {
  data: FieldData;
}

export function LayersRuntime({ data }: LayersRuntimeProps) {
  const map = getCurrentMap();

  // Centralized LayerManager binding
  useLayerManager(map);
  useNavDestination(map); // NEW glow overlay listener

  // Mount venues and weather as map layers
  useTileVenuesLayer(map, data.nearbyVenues);
  useSocialWeatherLayer(map, data.weatherCells);

  // User aura overlay with vibe-colored ring
  return (
    <>
      <PredictedMeetingPointsLayer />
      <BreadcrumbMapLayer map={map} />
      <UserAuraOverlay map={map} layerManager={layerManager} enabled />
    </>
  );
}