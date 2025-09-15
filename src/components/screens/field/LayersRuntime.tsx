import React, { useMemo, useEffect } from 'react';
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
import { PresenceCardHost } from '@/components/map/PresenceCardHost';
import { useAvatarSprites } from '@/lib/map/hooks/useAvatarSprites';
import { buildPresenceFC, createPresenceClusterOverlay } from '@/lib/map/overlays/presenceClusterOverlay';
import type { FieldData } from './FieldDataProvider';
import '@/styles/map-popups.css';

interface LayersRuntimeProps {
  data: FieldData;
}

export function LayersRuntime({ data }: LayersRuntimeProps) {
  const map = getCurrentMap();
  const { location } = useFieldLocation();

  // Centralized LayerManager binding (returns the manager instance)
  const layerManager = useLayerManager(map);
  useNavDestination(map);

  // ---------- Normalize inputs safely ----------
  const nearbyVenues = useMemo(
    () => (Array.isArray(data?.nearbyVenues) ? data.nearbyVenues : []),
    [data?.nearbyVenues]
  );

  const weatherCells = useMemo(
    () => (Array.isArray(data?.weatherCells) ? data.weatherCells : []),
    [data?.weatherCells]
  );

  // Mount venues and weather as map layers with safe data
  useTileVenuesLayer(map, nearbyVenues);
  useSocialWeatherLayer(map, weatherCells);

  // Get nearby friends data
  const { data: nearbyFriends } = useNearbyFriends(
    location.coords?.lat,
    location.coords?.lng,
    { km: 2, enabled: !!location.coords }
  );

  const friendsList = useMemo(
    () => (Array.isArray(nearbyFriends) ? nearbyFriends : []),
    [nearbyFriends]
  );

  // Load avatar sprites and get iconIds map
  const { iconIds } = useAvatarSprites(
    map,
    friendsList.map((f: any) => ({ id: String(f.id ?? ''), photoUrl: f.avatar_url ?? f.photoUrl ?? '' })),
    { size: 64, concurrency: 3 }
  );

  // Build unified presence data safely
  const presenceFC = useMemo(() => {
    // self tap is handled by aura overlay → don't inject here
    const self = undefined;

    const friends = friendsList
      .map((f: any) => ({
        id: String(f.id ?? ''),
        name: f.display_name ?? f.name ?? '',
        photoUrl: f.avatar_url ?? f.photoUrl ?? '',
        lat: Number(f.lat),
        lng: Number(f.lng),
        vibe: f.vibe ?? f.currentVibe ?? undefined,
        iconId: iconIds[String(f.id ?? '')] ?? undefined,
      }))
      .filter((f: any) => Number.isFinite(f.lat) && Number.isFinite(f.lng) && f.id);

    const venues = nearbyVenues
      .map((v: any) => ({
        id: String(v.pid ?? v.id ?? ''),
        name: v.name ?? 'Venue',
        lat: Number(v.lat),
        lng: Number(v.lng),
        category: v.category ?? undefined,
      }))
      .filter((v: any) => Number.isFinite(v.lat) && Number.isFinite(v.lng) && v.id);

    return buildPresenceFC({ self, friends, venues });
  }, [nearbyVenues, friendsList, iconIds]);

  // ---------- Register and apply unified presence overlay ----------
  useEffect(() => {
    if (!map || !layerManager) return;

    const spec = createPresenceClusterOverlay({
      id: 'presence',
      beforeId: 'user-aura-outer',
      initial: { type: 'FeatureCollection', features: [] },
      includeSelfHit: false, // aura owns it
    });

    layerManager.register(spec);

    const reapply = () => {
      if (!map.isStyleLoaded()) { 
        map.once('idle', reapply); 
        return; 
      }
      spec.mount(map);
    };
    
    map.on('styledata', reapply);
    map.on('load', reapply);

    return () => {
      map.off('styledata', reapply);
      map.off('load', reapply);
      layerManager.unregister('presence');
    };
  }, [map, layerManager]);

  // Apply feature collection when it changes
  useEffect(() => {
    if (!map || !layerManager) return;
    layerManager.apply('presence', presenceFC);
  }, [map, layerManager, presenceFC]);

  // Overlays with clustering + cards
  return (
    <>
      <PredictedMeetingPointsLayer />
      <BreadcrumbMapLayer map={map} />
      <UserAuraOverlay map={map} layerManager={layerManager} enabled />
      
      {/* Info cards */}
      <PresenceCardHost />
    </>
  );
}