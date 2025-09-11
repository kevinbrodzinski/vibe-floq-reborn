import type { FriendFlowLine } from '@/lib/api/friendFlows';

type FriendFlowRow = {
  friend_id: string;
  friend_name?: string | null;
  avatar_url?: string | null;
  line_geojson?: GeoJSON.LineString | null;
  head_lng: number;
  head_lat: number;
  t_head: string;
};

const SRC = 'friend-flows-src';
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

export function addFriendFlowsLayer(map: any, rows: FriendFlowRow[]) {
  const fc = rowsToFC(rows);

  const upsert = () => {
    // source
    if (map.getSource(SRC)) {
      (map.getSource(SRC) as mapboxgl.GeoJSONSource).setData(fc as any);
    } else {
      map.addSource(SRC, { type: 'geojson', data: fc as any });
    }

    // line layer
    if (!map.getLayer(LYR_LINE)) {
      map.addLayer({
        id: LYR_LINE,
        type: 'line',
        source: SRC,
        filter: ['==', ['get', 'type'], 'line'],
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': 'rgba(147, 197, 253, 0.85)', // sky-300-ish
          'line-width': ['interpolate', ['linear'], ['zoom'], 10, 2, 16, 4],
          'line-blur': 0.5,
        },
      });
    }

    // head layer
    if (!map.getLayer(LYR_HEAD)) {
      map.addLayer({
        id: LYR_HEAD,
        type: 'circle',
        source: SRC,
        filter: ['==', ['get', 'type'], 'head'],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 4, 16, 7],
          'circle-color': 'white',
          'circle-stroke-color': 'rgba(99,102,241,1)', // indigo stroke
          'circle-stroke-width': 2,
        },
      });
    }
  };

  // If style not ready, wait once; also re-add after future style changes
  const addNowOrLater = () => (map.isStyleLoaded?.() ? upsert() : map.once('style.load', upsert));
  addNowOrLater();

  // Return cleanup — remove layers/sources & any future listeners
  return () => {
    try {
      if (map.getLayer(LYR_HEAD)) map.removeLayer(LYR_HEAD);
      if (map.getLayer(LYR_LINE)) map.removeLayer(LYR_LINE);
      if (map.getSource(SRC)) map.removeSource(SRC);
    } catch {}
  };
}

export function removeFriendFlowsLayer(map: any) {
  try {
    if (map.getLayer(LYR_HEAD)) map.removeLayer(LYR_HEAD);
    if (map.getLayer(LYR_LINE)) map.removeLayer(LYR_LINE);
    if (map.getSource(SRC)) map.removeSource(SRC);
  } catch (e) {
    // Ignore cleanup errors
  }
}