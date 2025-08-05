/**
 * Keeps a persistent `user-location` source + layer alive through style reloads.
 */
import mapboxgl from 'mapbox-gl';

export const USER_LOC_SRC   = 'user-location';
export const USER_LOC_LAYER = 'user-location-dot';

export function attachUserLocationSource(map: mapboxgl.Map) {
  const ensure = () => {
    if (!map.isStyleLoaded()) return; // wait for style

    // add missing source
    if (!map.getSource(USER_LOC_SRC)) {
      map.addSource(USER_LOC_SRC, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });
    }

    // add missing layer
    if (!map.getLayer(USER_LOC_LAYER)) {
      map.addLayer({
        id: USER_LOC_LAYER,
        type: 'circle',
        source: USER_LOC_SRC,
        paint: {
          'circle-color': '#3B82F6',
          'circle-radius': 8,
          'circle-stroke-color': '#fff',
          'circle-stroke-width': 2
        }
      });
    }
  };

  // first run + subscribe
  ensure();
  map.on('style.load',  ensure);
  map.on('styledata',   ensure);

  return () => {
    map.off('style.load',  ensure);
    map.off('styledata',   ensure);
  };
}

export function setUserLocation(map: mapboxgl.Map, lat: number, lng: number, accuracy = 15) {
  const push = () => {
    if (!map.isStyleLoaded()) return false;
    const src = map.getSource(USER_LOC_SRC) as mapboxgl.GeoJSONSource | undefined;
    if (!src?.setData) return false;

    src.setData({
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: { accuracy },
        geometry: { type: 'Point', coordinates: [lng, lat] }
      }]
    });
    return true;
  };

  if (!push()) map.once('style.load', push);
}