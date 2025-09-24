import type mapboxgl from 'mapbox-gl';
import { hashJSON } from '@/lib/map/hash';

type FriendFlowRow = {
  friend_id: string;
  friend_name?: string | null;
  avatar_url?: string | null;
  line_geojson?: GeoJSON.LineString | null;
  head_lng: number;
  head_lat: number;
  t_head: string;
};

const SRC_ID = 'friend-flows-src';
const LYR_LINE = 'friend-flows-line';
const LYR_HEAD = 'friend-flows-head';

function rowsToFC(rows: FriendFlowRow[]): GeoJSON.FeatureCollection {
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
        },
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
      },
    });
  }
  return { type: 'FeatureCollection', features };
}

/** Create idempotent update function for LayerManager */
export function friendFlowsUpdateFn(rows: FriendFlowRow[]) {
  const fc = rows?.length ? rowsToFC(rows) : { type: 'FeatureCollection', features: [] as any[] };
  const hash = hashJSON(fc);

  const update = (map: mapboxgl.Map) => {
    // Create or update source
    if (!map.getSource(SRC_ID)) {
      map.addSource(SRC_ID, { type: 'geojson', data: fc as any });
    } else {
      (map.getSource(SRC_ID) as mapboxgl.GeoJSONSource).setData(fc as any);
    }

    // Create line layer if missing
    if (!map.getLayer(LYR_LINE)) {
      map.addLayer({
        id: LYR_LINE,
        type: 'line',
        source: SRC_ID,
        filter: ['==', ['get', 'type'], 'line'],
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': 'rgba(147, 197, 253, 0.85)',
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 2, 16, 4],
          'line-blur': 0.5,
        },
      });
    }

    // Create head layer if missing
    if (!map.getLayer(LYR_HEAD)) {
      map.addLayer({
        id: LYR_HEAD,
        type: 'circle',
        source: SRC_ID,
        filter: ['==', ['get', 'type'], 'head'],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 4, 16, 7],
          'circle-color': 'white',
          'circle-stroke-color': 'rgba(99,102,241,1)',
          'circle-stroke-width': 2,
        },
      });
    }
  };

  const unmount = (map: mapboxgl.Map) => {
    try { if (map.getLayer(LYR_HEAD)) map.removeLayer(LYR_HEAD); } catch {}
    try { if (map.getLayer(LYR_LINE)) map.removeLayer(LYR_LINE); } catch {}
    try { if (map.getSource(SRC_ID)) map.removeSource(SRC_ID); } catch {}
  };

  return { hash, update, unmount };
}

/** Legacy function - use friendFlowsUpdateFn with LayerManager instead */
export function addFriendFlowsLayer(map: mapboxgl.Map | null, rows: FriendFlowRow[]) {
  if (!map) return () => {};

  const { update, unmount } = friendFlowsUpdateFn(rows);
  
  const apply = () => {
    if (map.isStyleLoaded?.()) {
      try { update(map); } catch (e) { console.warn('Friend flows update failed:', e); }
    }
  };

  const onStyle = () => apply();
  if (map.isStyleLoaded?.()) apply();
  else map.once('style.load', onStyle);
  map.on('style.load', onStyle);

  return () => {
    try { map.off('style.load', onStyle); } catch {}
    try { unmount(map); } catch {}
  };
}