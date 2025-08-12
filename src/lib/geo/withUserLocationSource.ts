/**
 * Keeps a persistent `user-location` source + layer alive through style reloads.
 */
import mapboxgl from 'mapbox-gl';

export const USER_LOC_SRC   = 'user-location';
export const USER_LOC_LAYER = 'user-location-dot';

export function attachUserLocationSource(map: mapboxgl.Map): () => void {
  // Guard against invalid map reference
  if (!map || typeof map.isStyleLoaded !== 'function') {
    console.error('[attachUserLocationSource] Invalid map reference:', map);
    return () => {}; // Return no-op cleanup function
  }
  
  let isSourceReady = false;
  
  const ensure = () => {
    if (!map.isStyleLoaded()) {
      console.log('[attachUserLocationSource] Style not loaded, waiting...');
      return; // wait for style
    }

    // add missing source
    if (!map.getSource(USER_LOC_SRC)) {
      map.addSource(USER_LOC_SRC, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });
      console.log('[attachUserLocationSource] ✅ Source added');
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
      console.log('[attachUserLocationSource] ✅ Layer added');
    }
    
    isSourceReady = true;
    console.log('[attachUserLocationSource] ✅ Setup complete, source ready');
  };

  // first run + subscribe
  console.log('[attachUserLocationSource] Running initial ensure...');
  ensure();
  map.on('style.load',  ensure);
  map.on('styledata',   ensure);

  // Expose readiness check
  (map as any).__userLocationSourceReady = () => isSourceReady && map.getSource(USER_LOC_SRC);

  return () => {
    map.off('style.load',  ensure);
    map.off('styledata',   ensure);
    // tidy up on unmount / style switch
    if (map.getLayer(USER_LOC_LAYER))  map.removeLayer(USER_LOC_LAYER);
    if (map.getSource(USER_LOC_SRC))   map.removeSource(USER_LOC_SRC);
    delete (map as any).__userLocationSourceReady;
  };
}

export function setUserLocation(
  map: mapboxgl.Map,
  lat: number,
  lng: number,
  accuracy = 15,
  attempt = 0
) {
  const MAX_RETRY = 10;

  const push = () => {
    // Guard against invalid map reference
    if (!map || typeof map.isStyleLoaded !== 'function') {
      console.error('[setUserLocation] Invalid map reference:', map);
      return false;
    }
    
    // Enhanced debugging
    const styleLoaded = map.isStyleLoaded();
    const src = map.getSource(USER_LOC_SRC) as mapboxgl.GeoJSONSource | undefined;
    const hasSetData = !!src?.setData;
    const readyCheck = (map as any).__userLocationSourceReady?.();
    
    if (attempt === 0) {
      console.log('[setUserLocation] Initial attempt:', {
        styleLoaded,
        hasSource: !!src,
        hasSetData,
        readyCheck,
        coords: { lat, lng, accuracy }
      });
    }

    if (!styleLoaded) {
      if (attempt > 2) console.log('[setUserLocation] Waiting for style to load...');
      return false;
    }
    
    if (!src?.setData) {
      if (attempt > 2) console.log('[setUserLocation] Waiting for source to be available...');
      return false;
    }

    try {
      src.setData({
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          properties: { accuracy },
          geometry: { type: 'Point', coordinates: [lng, lat] }
        }]
      });
      
      if (attempt > 0) {
        console.log(`[setUserLocation] ✅ Success after ${attempt + 1} attempts`);
      }
      return true;
    } catch (error) {
      console.warn(`[setUserLocation] Error on attempt ${attempt + 1}:`, error);
      return false;
    }
  };

  // success on first try?
  if (push()) return;

  // retry logic ────────────────────────────────────────────────
  if (attempt >= MAX_RETRY) {
    console.error(`[setUserLocation] ❌ Gave up after ${MAX_RETRY} attempts. Debug info:`, {
      styleLoaded: map.isStyleLoaded(),
      hasSource: !!map.getSource(USER_LOC_SRC),
      hasLayer: !!map.getLayer(USER_LOC_LAYER),
      readyCheck: (map as any).__userLocationSourceReady?.()
    });
    
    // Final fallback: wait for next style load event
    console.log('[setUserLocation] 🔄 Trying fallback: waiting for next style load...');
    const fallbackHandler = () => {
      map.off('style.load', fallbackHandler);
      setTimeout(() => {
        console.log('[setUserLocation] 🔄 Fallback attempt after style load');
        if (push()) {
          console.log('[setUserLocation] ✅ Fallback succeeded!');
        } else {
          console.error('[setUserLocation] ❌ Even fallback failed');
        }
      }, 100);
    };
    map.once('style.load', fallbackHandler);
    return;
  }

  // Progressive backoff: longer delays for later attempts
  const delay = attempt < 3 ? 100 : attempt < 6 ? 200 : 300;
  setTimeout(() => setUserLocation(map, lat, lng, accuracy, attempt + 1), delay);
}