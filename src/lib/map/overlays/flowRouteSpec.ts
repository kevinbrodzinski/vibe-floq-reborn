/* eslint-disable @typescript-eslint/no-explicit-any */
import type { OverlaySpec } from '@/lib/map/LayerManager';

const SRC = 'flow-route-src';
const LINE_LYR = 'flow-route-line';
const VENUES_LYR = 'flow-route-venues';
const ACTIVE_LYR = 'flow-route-active';

export function createFlowRouteSpec(beforeId?: string): OverlaySpec {
  return {
    id: 'flow-route',
    beforeId,
    mount(map) {
      if (!map.getSource(SRC)) {
        map.addSource(SRC, { 
          type: 'geojson', 
          data: { type: 'FeatureCollection', features: [] } as any 
        });
      }

      // Add trail line layer
      if (!map.getLayer(LINE_LYR)) {
        const lineLayer: mapboxgl.LineLayer = {
          id: LINE_LYR,
          type: 'line',
          source: SRC,
          filter: ['==', ['get', 'type'], 'trail'],
          paint: {
            'line-color': [
              'case',
              ['==', ['get', 'mode'], 'retrace'],
              'hsl(var(--primary))',
              'rgba(147, 197, 253, 0.8)'
            ],
            'line-width': [
              'interpolate', ['linear'], ['zoom'],
              10, 3,
              16, 5
            ],
            'line-opacity': 0.8,
            'line-dasharray': [2, 2]
          },
          layout: {
            'line-cap': 'round',
            'line-join': 'round'
          }
        };
        beforeId && map.getLayer(beforeId) ? map.addLayer(lineLayer, beforeId) : map.addLayer(lineLayer);
      }

      // Add venue markers layer
      if (!map.getLayer(VENUES_LYR)) {
        const venuesLayer: mapboxgl.CircleLayer = {
          id: VENUES_LYR,
          type: 'circle',
          source: SRC,
          filter: ['==', ['get', 'type'], 'venue'],
          paint: {
            'circle-radius': [
              'interpolate', ['linear'], ['zoom'],
              12, 8,
              16, 12
            ],
            'circle-color': 'hsl(var(--primary))',
            'circle-stroke-color': 'hsl(var(--background))',
            'circle-stroke-width': 3,
            'circle-opacity': 0.9
          }
        };
        beforeId && map.getLayer(beforeId) ? map.addLayer(venuesLayer, beforeId) : map.addLayer(venuesLayer);
      }

      // Add active/current position marker
      if (!map.getLayer(ACTIVE_LYR)) {
        const activeLayer: mapboxgl.CircleLayer = {
          id: ACTIVE_LYR,
          type: 'circle',
          source: SRC,
          filter: ['==', ['get', 'type'], 'active'],
          paint: {
            'circle-radius': [
              'interpolate', ['linear'], ['zoom'],
              12, 10,
              16, 15
            ],
            'circle-color': '#EC4899',
            'circle-stroke-color': 'white',
            'circle-stroke-width': 3,
            'circle-opacity': 0.9
          }
        };
        beforeId && map.getLayer(beforeId) ? map.addLayer(activeLayer, beforeId) : map.addLayer(activeLayer);
      }
    },
    update(map, fc) {
      const src = map.getSource(SRC) as mapboxgl.GeoJSONSource;
      src?.setData(fc as any);
    },
    unmount(map) {
      try { if (map.getLayer(ACTIVE_LYR)) map.removeLayer(ACTIVE_LYR); } catch {}
      try { if (map.getLayer(VENUES_LYR)) map.removeLayer(VENUES_LYR); } catch {}
      try { if (map.getLayer(LINE_LYR)) map.removeLayer(LINE_LYR); } catch {}
      try { if (map.getSource(SRC)) map.removeSource(SRC); } catch {}
    }
  };
}

// Helper to convert flow route data to GeoJSON
export function flowRouteToFC(flowRoute: any[]): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];

  // Add venue points
  flowRoute.forEach((point, index) => {
    if (point.position) {
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: point.position },
        properties: {
          type: 'venue',
          id: point.id,
          name: point.venueName || `Stop ${index + 1}`,
          index: index,
          timestamp: point.timestamp,
          duration: point.duration
        }
      });
    }
  });

  // Add trail line if we have multiple points
  if (flowRoute.length > 1) {
    const coordinates = flowRoute
      .filter(p => p.position)
      .map(p => p.position);

    if (coordinates.length > 1) {
      features.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates
        },
        properties: {
          type: 'trail',
          mode: 'retrace'
        }
      });
    }
  }

  return { type: 'FeatureCollection', features };
}