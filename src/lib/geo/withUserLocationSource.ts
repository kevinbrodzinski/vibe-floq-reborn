/**
 * Ensures user-location source and layer persist through style reloads
 * Fixes the issue where hot-reload wipes custom sources/layers
 */
import mapboxgl from 'mapbox-gl';

export const withUserLocationSource = (map: mapboxgl.Map) => {
  function ensureSource() {
    // Add source if missing
    if (!map.getSource("user-location")) {
      map.addSource("user-location", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] }
      });
      console.log('[withUserLocationSource] ✅ Added user-location source');
    }

    // Add layer if missing  
    if (!map.getLayer("user-location-dot")) {
      map.addLayer({
        id: "user-location-dot",
        type: "circle",
        source: "user-location",
        paint: {
          "circle-color": "#3B82F6",
          "circle-radius": 8,
          "circle-stroke-color": "#fff",
          "circle-stroke-width": 2
        }
      });
      console.log('[withUserLocationSource] ✅ Added user-location-dot layer');
    }
  }

  // Ensure source exists on initial load
  map.on("load", ensureSource);
  
  // Re-add source after style refreshes (hot-reload, style changes)
  map.on("styledata", ensureSource);
  
  console.log('[withUserLocationSource] 🔧 User location source helper attached');
};