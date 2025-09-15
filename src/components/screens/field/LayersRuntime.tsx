import React from 'react';
import { getCurrentMap } from '@/lib/geo/mapSingleton';
import { useLayerManager } from '@/hooks/useLayerManager';
import { useNavDestination } from '@/hooks/useNavDestination';
import { useTileVenuesLayer } from '@/map/layers/useTileVenuesLayer';
import { useSocialWeatherLayer } from '@/map/layers/useSocialWeatherLayer';
import { useNearbyFriends } from '@/hooks/useNearbyFriends';
import { useFieldLocation } from '@/components/field/contexts/FieldLocationContext';
import { PredictedMeetingPointsLayer } from '@/map/layers/PredictedMeetingPointsLayer';
import { BreadcrumbMapLayer } from '@/components/map/BreadcrumbMapLayer';
import { UserAuraOverlay } from '@/components/map/UserAuraOverlay';
import { PresenceClusterOverlay } from '@/components/map/PresenceClusterOverlay';
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
  const { location } = useFieldLocation();

  // Centralized LayerManager binding
  useLayerManager(map);
  useNavDestination(map); // NEW glow overlay listener

  // Mount venues and weather as map layers
  useTileVenuesLayer(map, data.nearbyVenues);
  useSocialWeatherLayer(map, data.weatherCells);

  // Get nearby friends data
  const { data: nearbyFriends } = useNearbyFriends(
    location.coords?.lat,
    location.coords?.lng,
    { km: 2, enabled: !!location.coords }
  );

  // Transform data for unified presence overlay
  const presenceData = {
    friends: nearbyFriends?.map(f => ({
      id: f.id,
      name: f.display_name,
      photoUrl: f.avatar_url,
      lat: f.lat,
      lng: f.lng,
      distance_m: f.distance_m
    })),
    venues: data.nearbyVenues?.map(v => ({
      id: v.pid,
      name: v.name,
      lat: v.lat,
      lng: v.lng,
      category: v.category
    }))
  };

  // Overlays with clustering + cards
  return (
    <>
      <PredictedMeetingPointsLayer />
      <BreadcrumbMapLayer map={map} />
      <UserAuraOverlay map={map} layerManager={layerManager} enabled />
      
      {/* Unified presence overlay - friends, venues, and self hit target */}
      <PresenceClusterOverlay 
        data={presenceData} 
        enabled={true} 
        beforeId="user-aura-outer" 
      />
      
      {/* Info cards */}
      <FriendInfoCard />
      <VenueInfoCard />
    </>
  );
}