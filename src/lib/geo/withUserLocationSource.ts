/**
 * Enhanced user location source helper with proper cleanup and race condition fixes
 */
import mapboxgl from 'mapbox-gl';

export const USER_LOC_SRC   = 'user-location';
export const USER_LOC_LAYER = 'user-location-dot';

export function attachUserLocationSource(map: mapboxgl.Map) {
  if (!map) return () => {};

  const ensure = () => {
    // FIX: Guard against style not being loaded
    if (!map.isStyleLoaded()) {
      devLog('⏳ Style not loaded yet, will retry on style.load');
      return;
    }
    
    // Fast-bail: if both source and layer exist, nothing to do
    if (map.getSource(USER_LOC_SRC) && map.getLayer(USER_LOC_LAYER)) return;

    // Add source if missing
    if (!map.getSource(USER_LOC_SRC)) {
      map.addSource(USER_LOC_SRC, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });
      devLog('✅ Added source');
    }

    // Wait until style is ready before adding the layer
    const addLayer = () => {
      if (map.getLayer(USER_LOC_LAYER)) return;
      
      try {
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
        devLog('✅ Added layer');
      } catch (error) {
        devLog(`⚠️ Layer add failed: ${error}`);
        // Retry on next idle if style isn't ready
        map.once('idle', addLayer);
      }
    };

    map.isStyleLoaded() ? addLayer() : map.once('idle', addLayer);
  };

  // Run once immediately (covers the case map already loaded)
  if (map.isStyleLoaded()) {
    ensure();
  }

  // Subscribe for future style reloads - use 'style.load' for better reliability
  map.on('style.load', ensure);
  map.on('styledata', ensure);

  devLog('🔧 Helper attached');

  // Return cleanup function
  return () => {
    map.off('style.load', ensure);
    map.off('styledata', ensure);
    devLog('🧹 Helper detached');
  };
}

/**
 * Safe utility to update user location data
 */
export function setUserLocation(
  map: mapboxgl.Map, 
  lat: number, 
  lng: number, 
  accuracy?: number
) {
  if (!map) return;

  const trySetData = () => {
    // FIX: Guard against style not being loaded
    if (!map.isStyleLoaded()) {
      devLog('⏳ Style not loaded for setUserLocation, will retry');
      map.once('style.load', trySetData);
      return false;
    }
    
    const src = map.getSource(USER_LOC_SRC) as mapboxgl.GeoJSONSource;
    if (src && 'setData' in src) {
      src.setData({
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [lng, lat]
          },
          properties: {
            accuracy: accuracy || 10
          }
        }]
      });
      devLog(`📍 Location updated: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      return true;
    }
    return false;
  };

  // Try immediately, if source doesn't exist wait for it
  if (!trySetData()) {
    map.once('sourcedata', trySetData);
  }
}

function devLog(msg: string) {
  if (import.meta.env.DEV) {
    console.log(`[withUserLocationSource] ${msg}`);
  }
}