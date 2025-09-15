import { useEffect, useMemo } from 'react';
import { getCurrentMap } from '@/lib/geo/mapSingleton';
import { layerManager } from '@/lib/map/LayerManager';
import { createPresenceClusterOverlay, buildPresenceFC } from '@/lib/map/overlays/presenceClusterOverlay';
import { useFieldLocation } from '@/components/field/contexts/FieldLocationContext';
import { useNearbyFriends } from '@/hooks/useNearbyFriends';
import { ensureAvatarImage } from '@/lib/map/avatarSprite';
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
    if (!map || !enabled) return;
    
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
  }, [map, enabled, beforeId, featureCollection]);

  // Update data when it changes
  useEffect(() => {
    if (map && enabled) {
      layerManager.apply('presence', featureCollection);
    }
  }, [map, featureCollection, enabled]);

  // Preload friend avatar sprites
  useEffect(() => {
    if (!map || !enabled || !data.friends) return;

    const loadAvatars = async () => {
      for (const friend of data.friends || []) {
        if (friend.photoUrl) {
          try {
            const iconId = await ensureAvatarImage(map, friend.id, friend.photoUrl, 64);
            if (iconId) {
              // Update the feature collection to include the iconId
              // This will trigger a re-render with the avatar sprite
              const updatedFC = buildPresenceFC({
                self: selfLocation ? {
                  lat: selfLocation.lat,
                  lng: selfLocation.lng
                } : undefined,
                friends: data.friends?.map(f => ({
                  ...f,
                  // Mark this friend as having an avatar loaded
                  iconId: f.id === friend.id ? iconId : (f as any).iconId
                })),
                venues: data.venues?.map(v => ({
                  id: v.id,
                  name: v.name,
                  lat: v.lat,
                  lng: v.lng,
                  category: v.category
                }))
              });
              
              // Apply updated data with iconId
              layerManager.apply('presence', updatedFC);
            }
          } catch (error) {
            console.warn(`Failed to load avatar for ${friend.id}:`, error);
          }
        }
      }
    };

    // Delay avatar loading slightly to let the map settle
    const timeout = setTimeout(loadAvatars, 100);
    return () => clearTimeout(timeout);
  }, [map, enabled, data.friends, selfLocation, data.venues]);

  return null;
}