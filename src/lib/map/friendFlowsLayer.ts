import type { FriendFlowLine } from '@/lib/api/friendFlows';

export function addFriendFlowsLayer(map: any, lines: FriendFlowLine[]) {
  const SRC = 'friend-flows-src';
  const LYR_LINE = 'friend-flows-line';
  const LYR_HEAD = 'friend-flows-head';

  const fc: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: lines.flatMap((r) => {
      const line = r.line_geojson;
      if (!line) return [];
      
      return [
        // Flow line
        {
          type: 'Feature',
          geometry: line,
          properties: {
            type: 'line',
            friend_id: r.friend_id,
            friend_name: r.friend_name ?? 'Friend',
            avatar: r.avatar_url ?? '',
            t_head: r.t_head
          }
        },
        // Flow head point
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [r.head_lng, r.head_lat]
          },
          properties: {
            type: 'head',
            friend_id: r.friend_id,
            friend_name: r.friend_name ?? 'Friend',
            avatar: r.avatar_url ?? '',
            t_head: r.t_head
          }
        }
      ];
    })
  };

  // Add or update source
  if (!map.getSource(SRC)) {
    map.addSource(SRC, { type: 'geojson', data: fc });
  } else {
    (map.getSource(SRC) as mapboxgl.GeoJSONSource).setData(fc);
  }

  // Add flow lines layer
  if (!map.getLayer(LYR_LINE)) {
    map.addLayer({
      id: LYR_LINE,
      type: 'line',
      source: SRC,
      filter: ['==', ['get', 'type'], 'line'],
      paint: {
        'line-color': 'rgba(147, 197, 253, 0.85)', // Light blue with transparency
        'line-width': [
          'interpolate', ['linear'], ['zoom'],
          10, 2.0,
          16, 4.0
        ],
        'line-blur': 0.5
      },
      layout: { 
        'line-join': 'round', 
        'line-cap': 'round' 
      }
    });
  }

  // Add flow head points layer
  if (!map.getLayer(LYR_HEAD)) {
    map.addLayer({
      id: LYR_HEAD,
      type: 'circle',
      source: SRC,
      filter: ['==', ['get', 'type'], 'head'],
      paint: {
        'circle-radius': [
          'interpolate', ['linear'], ['zoom'],
          10, 4,
          16, 7
        ],
        'circle-color': 'white',
        'circle-stroke-color': 'rgba(99,102,241,1)', // Indigo stroke
        'circle-stroke-width': 2
      }
    });
  }
}

export function removeFriendFlowsLayer(map: any) {
  const SRC = 'friend-flows-src';
  const LYR_LINE = 'friend-flows-line';
  const LYR_HEAD = 'friend-flows-head';

  try {
    if (map.getLayer(LYR_HEAD)) map.removeLayer(LYR_HEAD);
    if (map.getLayer(LYR_LINE)) map.removeLayer(LYR_LINE);
    if (map.getSource(SRC)) map.removeSource(SRC);
  } catch (e) {
    // Ignore cleanup errors
  }
}