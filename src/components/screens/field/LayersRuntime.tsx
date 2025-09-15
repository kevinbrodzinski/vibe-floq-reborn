import React from 'react';
import { getCurrentMap } from '@/lib/geo/mapSingleton';
import { useLayerManager } from '@/hooks/useLayerManager';
import { useNavDestination } from '@/hooks/useNavDestination';
import { useTileVenuesLayer } from '@/map/layers/useTileVenuesLayer';
import { useSocialWeatherLayer } from '@/map/layers/useSocialWeatherLayer';
import { PredictedMeetingPointsLayer } from '@/map/layers/PredictedMeetingPointsLayer';
import { BreadcrumbMapLayer } from '@/components/map/BreadcrumbMapLayer';
import { UserAuraOverlay } from '@/components/map/UserAuraOverlay';
import { FriendsClusterOverlay } from '@/components/map/FriendsClusterOverlay';
import { VenuesClusterOverlay } from '@/components/map/VenuesClusterOverlay';
import { FriendInfoCard } from '@/components/map/FriendInfoCard';
import { VenueInfoCard } from '@/components/map/VenueInfoCard';
import { layerManager } from '@/lib/map/LayerManager';
import type { FieldData } from './FieldDataProvider';
import '@/styles/map-popups.css';

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

  // Mock friend and venue data for now - replace with real data
  const friendsData: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: [] // TODO: replace with actual friend locations
  };

  const venuesData: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection', 
    features: data.nearbyVenues.map(v => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [v.lng, v.lat] },
      properties: {
        venueId: v.pid,
        name: v.name,
        category: v.category,
        vibeHex: '#22c55e'
      }
    }))
  };

  // Overlays with clustering + cards
  return (
    <>
      <PredictedMeetingPointsLayer />
      <BreadcrumbMapLayer map={map} />
      <UserAuraOverlay map={map} layerManager={layerManager} enabled />
      
      {/* Clustering overlays */}
      <FriendsClusterOverlay 
        data={friendsData} 
        enabled={true} 
        beforeId="user-aura-outer" 
      />
      <VenuesClusterOverlay 
        data={venuesData} 
        enabled={true} 
        beforeId="friends-point" 
      />
      
      {/* Info cards */}
      <FriendInfoCard />
      <VenueInfoCard />
    </>
  );
}