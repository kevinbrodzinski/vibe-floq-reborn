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
import { CrossPathsBanner } from '@/components/presence/CrossPathsBanner';
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
    
    // Expose global state for convergence ranking
    (window as any).floq ??= {};
    (window as any).floq.nearbyVenues = nearbyVenues;
    (window as any).floq.myLocation = location.coords ? { 
      lng: location.coords.lng, 
      lat: location.coords.lat 
    } : undefined;

    // Build friendsIndex from presence FeatureCollection
    try {
      const idx: Record<string, {
        lngLat?: { lng:number; lat:number };
        energy01?: number;
        direction?: 'up'|'down'|'flat';
        name?: string;
        venue?: { id?: string; name?: string; lat?: number; lng?: number; category?: string; openNow?: boolean };
      }> = {};

      const feats = (presenceFC as any)?.features ?? [];
      for (const f of feats) {
        if (f?.properties?.kind !== 'friend') continue;

        const p = f.properties ?? {};
        const id = String(p.id ?? '');
        if (!id) continue;

        // friend lng/lat
        const coords = Array.isArray(f?.geometry?.coordinates) ? f.geometry.coordinates : null;
        const lngLat = (coords && Number.isFinite(coords[0]) && Number.isFinite(coords[1]))
          ? { lng: coords[0], lat: coords[1] } : undefined;

        // optional current venue (try multiple common keys)
        const vlat = Number(p.venue_lat ?? p.venueLat ?? p.v_lat ?? p?.venue?.lat);
        const vlng = Number(p.venue_lng ?? p.venueLng ?? p.v_lng ?? p?.venue?.lng);
        const venue = Number.isFinite(vlat) && Number.isFinite(vlng) ? {
          id: p.venue_id ?? p.venueId ?? p?.venue?.id,
          name: p.venue_name ?? p.venueName ?? p?.venue?.name,
          lat: vlat,
          lng: vlng,
          category: p.venue_category ?? p.venueCategory ?? p?.venue?.category,
          openNow: (p.venue_open_now ?? p.venueOpenNow ?? p?.venue?.open_now ?? p?.venue?.openNow) ?? undefined
        } : undefined;

        idx[id] = {
          lngLat,
          energy01: typeof p.energy01 === 'number' ? p.energy01 : undefined,
          direction: p.direction,
          name: p.name,
          venue
        };
      }
      (window as any).floq.friendsIndex = idx;
    } catch {
      // keep UI resilient
    }
  }, [map, layerManager, presenceFC, nearbyVenues, location.coords]);

  // Overlays with clustering + cards
  return (
    <>
      <PredictedMeetingPointsLayer />
      <BreadcrumbMapLayer map={map} />
      <UserAuraOverlay map={map} layerManager={layerManager} enabled />
      
      {/* Info cards */}
      <PresenceCardHost />
      
      {/* Cross paths banner */}
      <CrossPathsBanner />
    </>
  );
}