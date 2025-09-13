import type mapboxgl from 'mapbox-gl';

const SRC_ID     = 'flow:route';
const LYR_PATH   = 'flow:route:path';
const LYR_LINE   = 'flow:route:line';
const LYR_ANIM   = 'flow:route:anim';
const LYR_VENUES = 'flow:route:venues';
const LYR_LABELS = 'flow:route:labels';

/** Flow Route overlay:
 *  - path (dashed connectors)
 *  - line (main flow)
 *  - anim (pulse used during retrace)
 *  - venues (dots) + labels
 *
 * Feature properties:
 *  - LineString: { type: 'path' | 'flow' }
 *  - Point     : { type: 'venue', index?: number, color?: string }
 */
export function createFlowRouteSpec() {
  return {
    id: 'flow-route',

    mount(map: mapboxgl.Map) {
      if (!map.getSource(SRC_ID)) {
        map.addSource(SRC_ID, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] } as any
        });
      }

      // dashed path segments
      if (!map.getLayer(LYR_PATH)) {
        map.addLayer({
          id: LYR_PATH, type: 'line', source: SRC_ID,
          filter: ['==', ['get','type'], 'path'],
          layout: { 'line-join':'round', 'line-cap':'round' },
          paint: { 'line-color':'#fff', 'line-opacity':0.25, 'line-width':2, 'line-dasharray':[1,2] }
        });
      }

      // main flow line
      if (!map.getLayer(LYR_LINE)) {
        map.addLayer({
          id: LYR_LINE, type: 'line', source: SRC_ID,
          filter: ['==', ['get','type'], 'flow'],
          layout: { 'line-join':'round', 'line-cap':'round' },
          paint: {
            'line-color':'#A855F7',
            'line-opacity':0.6,
            'line-width':['interpolate',['linear'],['zoom'],12,3,16,5,20,8],
          }
        });
      }

      // shimmer overlay — opacity animated at runtime
      if (!map.getLayer(LYR_ANIM)) {
        map.addLayer({
          id: LYR_ANIM, type: 'line', source: SRC_ID,
          filter: ['==', ['get','type'], 'flow'],
          layout: { 'line-join':'round', 'line-cap':'round' },
          paint: { 'line-color':'#EC4899', 'line-opacity':0, 'line-width':10, 'line-blur':3 }
        });
      }

      // venue dots (vibe-aware if properties.color exists)
      if (!map.getLayer(LYR_VENUES)) {
        map.addLayer({
          id: LYR_VENUES, type: 'circle', source: SRC_ID,
          filter: ['==', ['get','type'], 'venue'],
          paint: {
            'circle-radius':['interpolate',['linear'],['zoom'],12,6,16,10,20,14],
            'circle-color':['coalesce',['get','color'], '#A855F7'],
            'circle-opacity':0.95,
            'circle-stroke-color':'#fff',
            'circle-stroke-width':2
          }
        });
      }

      // venue label index (halo matches color if present)
      if (!map.getLayer(LYR_LABELS)) {
        map.addLayer({
          id: LYR_LABELS, type: 'symbol', source: SRC_ID,
          filter: ['==', ['get','type'], 'venue'],
          layout: { 'text-field':['to-string',['get','index']], 'text-size':10, 'text-anchor':'center' },
          paint: {
            'text-color':'#fff',
            'text-halo-width':2,
            'text-halo-color':['coalesce',['get','color'],'#A855F7']
          }
        });
      }
    },

    update(map: mapboxgl.Map, fc: GeoJSON.FeatureCollection) {
      const src = map.getSource(SRC_ID) as mapboxgl.GeoJSONSource | undefined;
      if (src) src.setData(fc as any);
    },

    unmount(map: mapboxgl.Map) {
      [LYR_LABELS, LYR_ANIM, LYR_VENUES, LYR_PATH, LYR_LINE].forEach(id => {
        try { if (map.getLayer(id)) map.removeLayer(id); } catch {}
      });
      try { if (map.getSource(SRC_ID)) map.removeSource(SRC_ID); } catch {}
    },
  };
}