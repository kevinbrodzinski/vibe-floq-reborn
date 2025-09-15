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
  let dragging = false;
  let lastSelectedId: string | null = null;

  function moveToTop(map: mapboxgl.Map, ids: string[]) {
    const layers = map.getStyle()?.layers ?? [];
    const top = layers[layers.length - 1]?.id;
    if (!top) return;
    ids.forEach(id => { if (map.getLayer(id)) { try { map.moveLayer(id, top); } catch {} } });
  }

  const onDragStart = () => { dragging = true; };
  const onDragEnd = () => { setTimeout(() => dragging = false, 120); };
  const onMouseEnter = (map: mapboxgl.Map) => () => { map.getCanvas().style.cursor = 'pointer'; };
  const onMouseLeave = (map: mapboxgl.Map) => () => { map.getCanvas().style.cursor = ''; };

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
              'case',
              ['boolean', ['feature-state', 'isSelected'], false], 8, 
              [
                'interpolate', ['linear'], ['zoom'],
                10, 4, 14, 6, 16, 8
              ]
            ],
            'circle-color': [
              'case',
              ['has','color'], ['get','color'], // use vibe color if available
              dotColor
            ],
            'circle-stroke-color': strokeColor,
            'circle-stroke-width': [
              'case',
              ['boolean', ['feature-state', 'isSelected'], false], 2.5, 1.5
            ],
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
              'case',
              ['boolean', ['feature-state', 'isSelected'], false], 24, 18
            ],
            'circle-pitch-scale': 'viewport',
            'circle-opacity': 0.01,
            'circle-color': '#000000'
          }
        };
        map.addLayer(hit, DOT_ID);
      }

      // Drag guards
      map.on('dragstart', onDragStart);
      map.on('dragend', onDragEnd);

      // Cursor affordance on desktop
      map.on('mouseenter', HIT_ID, onMouseEnter(map));
      map.on('mouseleave', HIT_ID, onMouseLeave(map));

      // Click → emit app event with the feature props (no Mapbox Popup; use your UI)
      map.on('click', HIT_ID, (e) => {
        if (dragging || map.isMoving()) return; // guard against accidental clicks
        const f = e.features?.[0];
        if (!f) return;
        const p = f.properties || {};
        
        // Update selection state
        const src = map.getSource(SRC_ID) as mapboxgl.GeoJSONSource;
        if (src && lastSelectedId) {
          map.setFeatureState({ source: SRC_ID, id: lastSelectedId }, { isSelected: false });
        }
        const newId = String(p.id || '');
        if (src && newId) {
          map.setFeatureState({ source: SRC_ID, id: newId }, { isSelected: true });
          lastSelectedId = newId;
        }

        const detail = {
          kind: 'friend',
          id: newId,
          name: p.name ? String(p.name) : undefined,
          avatarUrl: p.avatarUrl ? String(p.avatarUrl) : undefined,
          vibe: p.vibe ? String(p.vibe) : undefined,
          distanceM: p.distanceM ? Number(p.distanceM) : undefined,
          lastSeen: p.lastSeen ? Number(p.lastSeen) : undefined,
          lngLat: f.geometry?.type === 'Point'
            ? { lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] }
            : { lng: e.lngLat.lng, lat: e.lngLat.lat },
          color: p.color ? String(p.color) : undefined
        };
        window.dispatchEvent(new CustomEvent('friends:select', { detail }));
      });

      // Move to top on mount
      moveToTop(map, [HIT_ID, DOT_ID]);
    },
    update(map: mapboxgl.Map, fc?: GeoJSON.FeatureCollection) {
      const src = map.getSource(SRC_ID) as mapboxgl.GeoJSONSource | undefined;
      if (src && fc) src.setData(fc);
    },
    unmount(map: mapboxgl.Map) {
      try {
        map.off('dragstart', onDragStart);
        map.off('dragend', onDragEnd);
        map.off('mouseenter', HIT_ID, onMouseEnter(map));
        map.off('mouseleave', HIT_ID, onMouseLeave(map));
      } catch {}
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