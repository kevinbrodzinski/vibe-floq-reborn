import type mapboxgl from 'mapbox-gl';

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

/** Mount/refresh Friend Flows. Returns cleanup(). */
export function addFriendFlowsLayer(map: mapboxgl.Map | null, rows: FriendFlowRow[]) {
  if (!map) return () => {};

  const fc = rows?.length ? rowsToFC(rows) : { type: 'FeatureCollection', features: [] as any[] };

  const upsert = () => {
    if (!map || !map.isStyleLoaded?.()) return;

    // dedupe via snapshot on the source instance
    const json = JSON.stringify(fc);
    const src = map.getSource(SRC_ID) as (mapboxgl.GeoJSONSource & { _prevJSON?: string }) | undefined;

    if (src) {
      if (src._prevJSON !== json) {
        src.setData(fc as any);
        (src as any)._prevJSON = json;
      }
    } else {
      map.addSource(SRC_ID, { type: 'geojson', data: fc as any });
      (map.getSource(SRC_ID) as any)._prevJSON = json;
    }

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

  const onStyle = () => upsert();

  if (map.isStyleLoaded?.()) upsert();
  else map.once('style.load', onStyle);

  map.on('style.load', onStyle);

  return () => {
    try { map.off('style.load', onStyle); } catch {}
    try { if (map.getLayer(LYR_HEAD)) map.removeLayer(LYR_HEAD); } catch {}
    try { if (map.getLayer(LYR_LINE)) map.removeLayer(LYR_LINE); } catch {}
    try { if (map.getSource(SRC_ID)) map.removeSource(SRC_ID); } catch {}
  };
}