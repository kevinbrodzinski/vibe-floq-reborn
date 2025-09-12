/* eslint-disable @typescript-eslint/no-explicit-any */
import type { OverlaySpec } from '@/lib/map/LayerManager';

const SRC = 'friend-flows-src';
const LYR_LINE = 'friend-flows-line';
const LYR_HEAD = 'friend-flows-head';

/**
 * Data shape expected by update():
 * FeatureCollection with features of:
 *  - line:   geometry LineString, properties { type:'line', friend_id, color? }
 *  - head:   geometry Point,      properties { type:'head', friend_id, color? }
 */
export function createFriendFlowsSpec(beforeId?: string): OverlaySpec {
  return {
    id: 'friend-flows',
    beforeId,
    mount(map) {
      if (!map.getSource(SRC)) {
        map.addSource(SRC, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } as any });
      }
      if (!map.getLayer(LYR_LINE)) {
        const layer: mapboxgl.LineLayer = {
          id: LYR_LINE,
          type: 'line',
          source: SRC,
          filter: ['==', ['get', 'type'], 'line'],
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': ['coalesce', ['get', 'color'], 'rgba(147, 197, 253, 0.85)'], // sky-300-ish
            'line-width': ['interpolate', ['linear'], ['zoom'], 10, 2, 16, 4],
            'line-blur': 0.5,
          }
        };
        beforeId && map.getLayer(beforeId) ? map.addLayer(layer, beforeId) : map.addLayer(layer);
      }
      if (!map.getLayer(LYR_HEAD)) {
        const layer: mapboxgl.CircleLayer = {
          id: LYR_HEAD,
          type: 'circle',
          source: SRC,
          filter: ['==', ['get', 'type'], 'head'],
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 4, 16, 7],
            'circle-color': ['coalesce', ['get', 'color'], 'white'],
            'circle-stroke-color': 'rgba(99,102,241,1)', // indigo stroke
            'circle-stroke-width': 2,
          }
        };
        beforeId && map.getLayer(beforeId) ? map.addLayer(layer, beforeId) : map.addLayer(layer);
      }
    },
    update(map, fc) {
      const src = map.getSource(SRC) as mapboxgl.GeoJSONSource;
      src?.setData(fc as any);
    },
    unmount(map) {
      try { if (map.getLayer(LYR_HEAD)) map.removeLayer(LYR_HEAD); } catch {}
      try { if (map.getLayer(LYR_LINE)) map.removeLayer(LYR_LINE); } catch {}
      try { if (map.getSource(SRC)) map.removeSource(SRC); } catch {}
    }
  };
}

// Helper to build FC from your rows
export type FriendFlowRow = {
  friend_id: string;
  friend_name?: string | null;
  avatar_url?: string | null;
  line_geojson?: GeoJSON.LineString | null;
  head_lng: number;
  head_lat: number;
  t_head: string;
  color?: string | null;
};

export function friendFlowsToFC(rows: FriendFlowRow[]): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  for (const r of rows ?? []) {
    if (r.line_geojson) {
      features.push({
        type: 'Feature',
        geometry: r.line_geojson,
        properties: {
          type: 'line',
          friend_id: r.friend_id,
          friend_name: r.friend_name ?? 'Friend',
          avatar: r.avatar_url ?? '',
          t_head: r.t_head,
          color: r.color ?? 'rgba(147, 197, 253, 0.85)',
        }
      });
    }
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [r.head_lng, r.head_lat] },
      properties: {
        type: 'head',
        friend_id: r.friend_id,
        friend_name: r.friend_name ?? 'Friend',
        avatar: r.avatar_url ?? '',
        t_head: r.t_head,
        color: r.color ?? undefined,
      }
    });
  }
  return { type: 'FeatureCollection', features };
}