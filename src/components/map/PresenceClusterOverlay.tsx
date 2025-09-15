import { useEffect, useMemo } from 'react';
import { getCurrentMap } from '@/lib/geo/mapSingleton';
import { layerManager } from '@/lib/map/LayerManager';
import { createPresenceClusterOverlay, buildPresenceFC, ensureAvatarImage } from '@/lib/map/overlays/presenceClusterOverlay';
import { useFieldLocation } from '@/components/field/contexts/FieldLocationContext';
import { useNearbyFriends } from '@/hooks/useNearbyFriends';
import { useAuth } from '@/hooks/useAuth';

interface PresenceData {
  friends?: Array<{
    id: string;
    name?: string;
    photoUrl?: string;
    lat: number;
    lng: number;
    vibe?: string;
    distance_m?: number;
  }>;
  venues?: Array<{
    id: string;
    name: string;
    lat: number;
    lng: number;
    category?: string;
  }>;
}

interface Props {
  data: PresenceData;
  enabled?: boolean;
  beforeId?: string;
}

export function PresenceClusterOverlay({ data, enabled = true, beforeId }: Props) {
  const map = getCurrentMap();
  const { user } = useAuth();
  const { location } = useFieldLocation();
  
  // Get current user location for self hit target
  const selfLocation = location.coords;

  // Transform data into unified GeoJSON format
  const featureCollection = useMemo(() => {
    if (!enabled) {
      return { type: 'FeatureCollection' as const, features: [] };
    }

    return buildPresenceFC({
      self: selfLocation ? {
        lat: selfLocation.lat,
        lng: selfLocation.lng
      } : undefined,
      friends: data.friends?.map(f => ({
        id: f.id,
        name: f.name,
        photoUrl: f.photoUrl,
        lat: f.lat,
        lng: f.lng,
        vibe: f.vibe
      })),
      venues: data.venues?.map(v => ({
        id: v.id,
        name: v.name,
        lat: v.lat,
        lng: v.lng,
        category: v.category
      }))
    });
  }, [data, enabled, selfLocation]);

  useEffect(() => {
    if (!map || !layerManager || !enabled) return;
    
    const spec = createPresenceClusterOverlay({
      id: 'presence',
      beforeId,
      initial: featureCollection
    });
    
    layerManager.register(spec);
    layerManager.apply('presence', featureCollection);

    const reapply = () => { 
      if (map.isStyleLoaded()) {
        spec.mount(map);
        // Reapply data after style change to restore avatar sprites
        layerManager.apply('presence', featureCollection);
      }
    };
    
    map.on('styledata', reapply);
    map.on('load', reapply);

    return () => {
      map.off('styledata', reapply);
      map.off('load', reapply);
      layerManager.unregister('presence');
    };
  }, [map, layerManager, enabled, beforeId, featureCollection]);

  // Update data when it changes
  useEffect(() => {
    if (map && layerManager && enabled) {
      layerManager.apply('presence', featureCollection);
    }
  }, [map, layerManager, featureCollection, enabled]);

  // Batch avatar loading to avoid multiple apply() calls
  useEffect(() => {
    if (!map || !layerManager || !enabled || !Array.isArray(data.friends) || !data.friends.length) return;

    let cancelled = false;

    const load = async () => {
      const iconIds: Record<string, string> = {};
      for (const f of data.friends!) {
        if (!f.photoUrl) continue;
        try {
          const id = await ensureAvatarImage(map, f.id, f.photoUrl, 64);
          if (cancelled || !id) continue;
          iconIds[f.id] = id;
        } catch {}
      }
      if (cancelled) return;

      // Build once with iconIds merged
      const updatedFC = buildPresenceFC({
        self: selfLocation ? { lat: selfLocation.lat, lng: selfLocation.lng } : undefined,
        friends: (data.friends ?? []).map(f => ({
          id: f.id,
          name: f.name,
          photoUrl: f.photoUrl,
          lat: f.lat,
          lng: f.lng,
          vibe: f.vibe,
          iconId: iconIds[f.id]
        })),
        venues: data.venues
      });
      layerManager.apply('presence', updatedFC);
    };

    const t = setTimeout(load, 120);
    return () => { cancelled = true; clearTimeout(t); };
  }, [map, layerManager, enabled, data.friends, data.venues, selfLocation]);

  return null;
}