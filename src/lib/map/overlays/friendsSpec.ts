/* eslint-disable @typescript-eslint/no-explicit-any */
import type { OverlaySpec } from '@/lib/map/LayerManager';
import type mapboxgl from 'mapbox-gl';
import { hslVar } from '@/lib/map/themeColor';

const SRC_ID = 'friends-src';
const DOT_ID = 'friends-dot';
const HIT_ID = 'friends-hit';

export type FriendFeatureProps = {
  id: string;
  name?: string;          // display-safe
  avatarUrl?: string;
  vibe?: string;          // 'chill' | 'social' | ...
  distanceM?: number;
  lastSeen?: number;
  color?: string;         // vibe-derived color
};

export function createFriendsSpec(beforeId?: string): OverlaySpec {
  return {
    id: 'friends',
    beforeId,
    mount(map: mapboxgl.Map) {
      if (!map.getSource(SRC_ID)) {
        map.addSource(SRC_ID, { type: 'geojson', data: { type:'FeatureCollection', features: [] } as any });
      }
      const dotColor = hslVar('--primary', 'hsl(210 100% 50%)');
      const strokeColor = hslVar('--background', 'hsl(0 0% 100%)');

      // Visible friend dots
      if (!map.getLayer(DOT_ID)) {
        const dot: mapboxgl.CircleLayer = {
          id: DOT_ID, type: 'circle', source: SRC_ID,
          paint: {
            'circle-radius': [
              'interpolate', ['linear'], ['zoom'],
              10, 4, 14, 6, 16, 8
            ],
            'circle-color': [
              'case',
              ['has','color'], ['get','color'], // use vibe color if available
              dotColor
            ],
            'circle-stroke-color': strokeColor,
            'circle-stroke-width': 1.5,
            'circle-opacity': 1
          }
        };
        beforeId && map.getLayer(beforeId) ? map.addLayer(dot, beforeId) : map.addLayer(dot);
      }

      // Large invisible hit layer for easy tapping
      if (!map.getLayer(HIT_ID)) {
        const hit: mapboxgl.CircleLayer = {
          id: HIT_ID, type: 'circle', source: SRC_ID,
          paint: {
            'circle-radius': [
              'interpolate', ['linear'], ['zoom'],
              10, 18, 14, 24, 16, 28
            ],
            'circle-color': 'rgba(0,0,0,0)',
          }
        };
        map.addLayer(hit, DOT_ID);
      }

      // Cursor affordance on desktop
      map.on('mouseenter', HIT_ID, () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', HIT_ID, () => { map.getCanvas().style.cursor = ''; });

      // Click → emit app event with the feature props (no Mapbox Popup; use your UI)
      map.on('click', HIT_ID, (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const p = f.properties || {};
        const detail = {
          id: String(p.id || ''),
          name: p.name ? String(p.name) : undefined,
          avatarUrl: p.avatarUrl ? String(p.avatarUrl) : undefined,
          vibe: p.vibe ? String(p.vibe) : undefined,
          distanceM: p.distanceM ? Number(p.distanceM) : undefined,
          lastSeen: p.lastSeen ? Number(p.lastSeen) : undefined,
          lngLat: (f.geometry.type === 'Point' ? (f.geometry.coordinates as [number,number]) : e.lngLat.toArray()),
          color: p.color ? String(p.color) : undefined
        };
        window.dispatchEvent(new CustomEvent('friends:select', { detail }));
      });
    },
    update(map: mapboxgl.Map, fc?: GeoJSON.FeatureCollection) {
      const src = map.getSource(SRC_ID) as mapboxgl.GeoJSONSource | undefined;
      if (src && fc) src.setData(fc);
    },
    unmount(map: mapboxgl.Map) {
      try { if (map.getLayer(HIT_ID)) map.removeLayer(HIT_ID); } catch {}
      try { if (map.getLayer(DOT_ID)) map.removeLayer(DOT_ID); } catch {}
      try { if (map.getSource(SRC_ID)) map.removeSource(SRC_ID); } catch {}
    }
  };
}

// Helper to build FeatureCollection from friend data
export function friendsToFeatureCollection(friends: Array<{
  id: string;
  name?: string;
  avatarUrl?: string;
  vibe?: string;
  lng: number;
  lat: number;
  distanceM?: number;
  lastSeen?: number;
  color?: string;
}>): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: friends.map(friend => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [friend.lng, friend.lat] },
      properties: {
        id: friend.id,
        name: friend.name,
        avatarUrl: friend.avatarUrl,
        vibe: friend.vibe,
        distanceM: friend.distanceM,
        lastSeen: friend.lastSeen,
        color: friend.color
      }
    }))
  };
}