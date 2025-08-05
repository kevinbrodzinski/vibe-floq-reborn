/**
 * Comprehensive Mapbox diagnostic script
 * Run this when map appears black/empty to identify the root cause
 */

export async function runMapDiagnostics() {
  console.log('🔍 === MAPBOX DIAGNOSTICS STARTING ===\n');
  
  const map = (window as any).__FLOQ_MAP;
  const results: Record<string, string> = {};
  
  if (!map) {
    console.log('❌ __FLOQ_MAP not found - map not initialized yet');
    
    // Check if getMapInstance works
    try {
      const { getMapInstance } = await import('@/lib/geo/project');
      const projectMap = getMapInstance();
      if (projectMap) {
        console.log('✅ getMapInstance() returns map, but __FLOQ_MAP not set');
        results.mapInstance = '⚠️ Found via getMapInstance but not __FLOQ_MAP';
      } else {
        console.log('❌ getMapInstance() also returns null');
        results.mapInstance = '❌ Both sources null';
      }
    } catch (e) {
      console.log('❌ Error checking getMapInstance:', e);
      results.mapInstance = '❌ Error accessing project map';
    }
    
    return { error: 'Map not initialized', ...results };
  }
  
  // ✔︎ 1. Check Mapbox access token
  console.log('1. 🔑 Checking access token...');
  try {
    // @ts-ignore - accessing internal Mapbox property
    const token = map._requestManager?._accessToken;
    if (token) {
      const tokenPrefix = token.substring(0, 8);
      results.accessToken = `✅ Token found: ${tokenPrefix}...`;
      console.log(`   ✅ Access token found: ${tokenPrefix}...`);
      
      // Check for network errors
      console.log('   💡 Check Network tab for 401/403 errors on tile requests');
    } else {
      results.accessToken = '❌ No access token found';
      console.log('   ❌ No access token found in map._requestManager._accessToken');
    }
  } catch (e) {
    results.accessToken = '❌ Error accessing token';
    console.log('   ❌ Error accessing access token:', e);
  }
  
  // ✔︎ 2. Style actually loaded?
  console.log('\n2. 🎨 Checking if style loaded...');
  const styleLoaded = map.isStyleLoaded();
  results.styleLoaded = styleLoaded ? '✅ Style loaded' : '❌ Style not loaded';
  console.log(`   ${results.styleLoaded}`);
  
  if (!styleLoaded) {
    console.log('   💡 If style not loaded, check for tile errors in console');
    console.log('   💡 Verify Mapbox token is valid');
  }
  
  // ✔︎ 3. Canvas present & sized?
  console.log('\n3. 📐 Checking canvas size...');
  const canvas = map.getCanvas();
  const rect = canvas.getBoundingClientRect();
  results.canvasSize = `${rect.width}x${rect.height}`;
  
  // Check for multiple canvas elements
  const canvasElements = document.querySelectorAll('.mapboxgl-canvas');
  results.canvasCount = `${canvasElements.length} canvas elements`;
  console.log(`   Canvas count: ${results.canvasCount}`);
  
  if (canvasElements.length > 1) {
    console.log('   ❌ Multiple Mapbox canvases detected - this causes conflicts!');
    console.log('   💡 Check for duplicate <FieldWebMap> components');
    results.canvasCountStatus = '❌ Multiple canvases';
  } else {
    results.canvasCountStatus = '✅ Single canvas';
  }
  
  if (rect.width === 0 || rect.height === 0) {
    console.log(`   ❌ Canvas size: ${rect.width}x${rect.height} (ZERO SIZE!)`);
    console.log('   💡 Fix: Add height: 100% to all parent containers');
    console.log('   💡 Quick test: document.querySelector("#root").style.height="100%"');
    results.canvasSizeStatus = '❌ Zero size detected';
  } else {
    console.log(`   ✅ Canvas size: ${rect.width}x${rect.height}`);
    results.canvasSizeStatus = '✅ Good size';
  }
  
  // ✔︎ 4. setMapInstance check
  console.log('\n4. 🔗 Checking setMapInstance registration...');
  try {
    const { getMapInstance } = await import('@/lib/geo/project');
    const projectMap = getMapInstance();
    
    if (projectMap === map) {
      console.log('   ✅ setMapInstance() was called correctly');
      results.mapInstanceStatus = '✅ Properly registered';
    } else if (projectMap) {
      console.log('   ⚠️  getMapInstance() returns different map object');
      results.mapInstanceStatus = '⚠️ Different map object';
    } else {
      console.log('   ❌ getMapInstance() returns null - setMapInstance() never called');
      results.mapInstanceStatus = '❌ Not registered';
      console.log('   💡 Check that map.once("load", ...) calls setMapInstance(map)');
    }
  } catch (e) {
    console.log('   ❌ Error checking setMapInstance:', e);
    results.mapInstanceStatus = '❌ Error checking registration';
  }
  
  // ✔︎ 5. Center position check
  console.log('\n5. 🌍 Checking map center...');
  const center = map.getCenter();
  const zoom = map.getZoom();
  results.center = `[${center.lng.toFixed(4)}, ${center.lat.toFixed(4)}] zoom: ${zoom.toFixed(1)}`;
  console.log(`   Center: ${results.center}`);
  
  if (Math.abs(center.lng) < 0.1 && Math.abs(center.lat) < 0.1) {
    console.log('   ❌ Centered at ocean (0,0) - location not set properly');
    console.log('   💡 Try: __FLOQ_MAP.jumpTo({center:[-122.4194,37.7749], zoom:12})');
    results.centerStatus = '❌ At ocean (0,0)';
  } else {
    console.log('   ✅ Centered at valid coordinates');
    results.centerStatus = '✅ Valid center';
  }
  
  // ✔︎ 4. Multiple maps check
  console.log('\n4. 🗺️ Checking for multiple maps...');
  const mapElements = document.querySelectorAll('.mapboxgl-map');
  results.mapCount = `${mapElements.length} maps found`;
  console.log(`   ${results.mapCount}`);
  
  if (mapElements.length > 1) {
    console.log('   ❌ Multiple maps detected - may cause conflicts');
    results.mapCountStatus = '❌ Multiple maps';
  } else {
    results.mapCountStatus = '✅ Single map';
  }
  
  // ✔︎ 5. Source caches check
  console.log('\n5. 🗃️ Checking source caches...');
  try {
    const sourceCaches = map.style.sourceCaches;
    const sourceNames = Object.keys(sourceCaches);
    results.sources = sourceNames.join(', ');
    console.log(`   Sources: ${results.sources}`);
    
    if (sourceNames.includes('mapbox-terrain')) {
      console.log('   ✅ Mapbox base sources found');
      results.sourcesStatus = '✅ Base sources OK';
    } else {
      console.log('   ❌ Missing expected base sources');
      results.sourcesStatus = '❌ Missing base sources';
    }
  } catch (e) {
    console.log('   ❌ Error accessing source caches:', e);
    results.sourcesStatus = '❌ Source cache error';
  }
  
  // 6. Location data check
  console.log('\n6. 📍 Checking location data...');
  const lastGeo = (window as any).__FLOQ_DEBUG_LAST_GEO;
  if (lastGeo) {
    results.locationData = `lat: ${lastGeo.lat}, lng: ${lastGeo.lng}`;
    console.log(`   ✅ Location data: ${results.locationData}`);
    results.locationStatus = '✅ Location available';
  } else {
    console.log('   ❌ No location data in __FLOQ_DEBUG_LAST_GEO');
    results.locationStatus = '❌ No location data';
  }
  
  // 7. User location source check
  console.log('\n7. 👤 Checking user location source...');
  try {
    const userSource = map.getSource('user-location');
    if (userSource) {
      const features = userSource._data?.features || [];
      results.userFeatures = `${features.length} features`;
      console.log(`   ✅ User location source: ${results.userFeatures}`);
      
      if (features.length > 0) {
        console.log('   📍 User features:', features.map((f: any) => f.geometry.coordinates));
      }
    } else {
      console.log('   ❌ User location source not found');
      results.userFeatures = '❌ Source missing';
    }
  } catch (e) {
    console.log('   ❌ Error checking user location source:', e);
    results.userFeatures = '❌ Error accessing source';
  }
  
  // Quick fixes section
  console.log('\n🔧 === QUICK FIXES TO TRY ===');
  console.log('1. Force resize: __FLOQ_MAP.resize()');
  console.log('2. Recenter manually: __FLOQ_MAP.jumpTo({center:[-122.4194,37.7749], zoom:12})');
  console.log('3. Add canvas border: __FLOQ_MAP.getCanvas().style.border="2px solid red"');
  console.log('4. Force root height: document.querySelector("#root").style.height="100%"');
  console.log('5. Check location data: window.__FLOQ_DEBUG_LAST_GEO');
  
  console.log('\n📊 === RESULTS SUMMARY ===');
  Object.entries(results).forEach(([key, value]) => {
    console.log(`${key}: ${value}`);
  });
  
  return results;
}

// Auto-setup in development and expose quick manual diagnostic
if (import.meta.env.DEV && typeof window !== 'undefined') {
  setTimeout(() => {
    (window as any).runMapDiagnostics = runMapDiagnostics;
    
    // Quick manual diagnostic for when the helper isn't available
    (window as any).quickMapCheck = () => {
      const map = (window as any).__FLOQ_MAP;
      if (!map) { console.log('❌ Map not on window'); return; }
      console.log('Style loaded →', map.isStyleLoaded());
      console.log('Canvas size  →', map.getCanvas().getBoundingClientRect());
      console.log('Center       →', map.getCenter().toArray(), 'zoom', map.getZoom());
      console.log('# canvases   →', document.querySelectorAll('.mapboxgl-canvas').length);
      console.log('Access token →', map._requestManager?._accessToken ? 'Set' : 'Missing');
    };
    
    console.log('🔍 Map diagnostics available:');
    console.log('  - window.runMapDiagnostics() (full diagnostic - async)');
    console.log('  - window.quickMapCheck() (quick manual check)');
  }, 1000);
}