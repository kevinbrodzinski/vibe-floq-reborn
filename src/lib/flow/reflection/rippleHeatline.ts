import type { LatLng } from './useConvergenceStories';

type EnergyPoint = { t: number | Date | string; energy: number };
type VenueLite = { id: string; name: string; loc: LatLng; categories?: string[] };

export type RippleEdge = {
  from: LatLng;
  to: LatLng;
  weight: number; // 0..1 influence strength
  color: string;
};

export function computeRippleInfluence({
  path,
  energy,
  venues = []
}: {
  path: LatLng[];
  energy: EnergyPoint[];
  venues?: VenueLite[];
}): RippleEdge[] {
  if (!path?.length || path.length < 2) return [];
  
  const edges: RippleEdge[] = [];
  const palette = ['#60a5fa', '#3b82f6', '#a855f7', '#ec4899', '#f43f5e']; // blue→pink→red
  
  // Simple approach: each path segment gets weight from nearest energy sample
  for (let i = 0; i < path.length - 1; i++) {
    const from = path[i];
    const to = path[i + 1];
    
    // Find closest energy sample by index (naive approach)
    const energyIdx = Math.min(i, energy.length - 1);
    const weight = Math.max(0, Math.min(1, energy[energyIdx]?.energy ?? 0.5));
    
    // Map weight to color
    const colorIdx = Math.floor(weight * (palette.length - 1));
    const color = palette[colorIdx] || palette[palette.length - 1];
    
    edges.push({ from, to, weight, color });
  }
  
  return edges;
}

// Mapbox layer management
export function useRippleHeatline(map: any, edges: RippleEdge[]) {
  const sourceId = 'ripple-heatline-source';
  const layerId = 'ripple-heatline-layer';
  
  const add = () => {
    if (!map) return;
    
    // Convert edges to GeoJSON
    const features = edges.map((edge, i) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'LineString' as const,
        coordinates: [[edge.from.lng, edge.from.lat], [edge.to.lng, edge.to.lat]]
      },
      properties: {
        weight: edge.weight,
        color: edge.color
      }
    }));
    
    const geojson = {
      type: 'FeatureCollection' as const,
      features
    };
    
    // Add or update source
    if (map.getSource(sourceId)) {
      map.getSource(sourceId).setData(geojson);
    } else {
      map.addSource(sourceId, {
        type: 'geojson',
        data: geojson
      });
    }
    
    // Add layer if not exists
    if (!map.getLayer(layerId)) {
      map.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 4,
          'line-opacity': 0.8
        }
      });
    }
  };
  
  const remove = () => {
    if (!map) return;
    try {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    } catch {}
  };
  
  return { add, remove };
}