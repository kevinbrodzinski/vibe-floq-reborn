/**
 * Enhanced map debugging to verify layer guards and token flow
 */

export function runMapDiagnostics() {
  console.log('\n🔍 === COMPREHENSIVE MAP DIAGNOSTICS ===');
  
  // Check token loading
  const envToken = import.meta.env.VITE_MAPBOX_TOKEN;
  const mapboxToken = (window as any).mapboxgl?.accessToken;
  
  console.log('\n🔑 Token Status:');
  console.log(`  Environment token: ${envToken ? `${envToken.substring(0, 15)}...` : 'NOT_SET'}`);
  console.log(`  Mapbox token: ${mapboxToken ? `${mapboxToken.substring(0, 15)}...` : 'NOT_SET'}`);
  console.log(`  Tokens match: ${envToken === mapboxToken}`);
  console.log(`  Your token: ${envToken?.includes('pk.eyJ1Ijoia2V2aW5icm9kemluc2tpIiwiYSI6ImNtZGR6b2VhZzBhazMyaW9vbG9lc3B6d3cifQ')}`);
  
  // Check map and layers
  const map = (window as any).__FLOQ_MAP;
  console.log('\n🗺️ Map Status:');
  console.log(`  Map instance: ${!!map}`);
  
  if (map) {
    console.log(`  Style loaded: ${map.isStyleLoaded()}`);
    console.log(`  Center: [${map.getCenter().lng.toFixed(4)}, ${map.getCenter().lat.toFixed(4)}]`);
    console.log(`  Zoom: ${map.getZoom().toFixed(2)}`);
    
    // Check layers
    const layers = map.getStyle()?.layers || [];
    const floqLayers = layers.filter(l => l.id.includes('floq'));
    
    console.log('\n🎯 Layer Status:');
    console.log(`  Total layers: ${layers.length}`);
    console.log(`  Floq layers: ${floqLayers.map(l => l.id).join(', ')}`);
    
    // Check specific layers
    const layersToCheck = ['floq-clusters', 'floq-points', 'floq-cluster-count'];
    layersToCheck.forEach(layerId => {
      const exists = !!map.getLayer(layerId);
      console.log(`  ${layerId}: ${exists ? '✅' : '❌'}`);
    });
    
    // Check sources
    console.log('\n📊 Source Status:');
    const floqSource = map.getSource('floqs');
    console.log(`  floqs source: ${!!floqSource}`);
    if (floqSource && floqSource._data) {
      console.log(`  floqs data features: ${floqSource._data.features?.length || 0}`);
    }
    
    const userLocationSource = map.getSource('user-location');
    console.log(`  user-location source: ${!!userLocationSource}`);
    
    // Check canvas
    const canvas = map.getCanvas();
    const rect = canvas.getBoundingClientRect();
    console.log('\n🖼️ Canvas Status:');
    console.log(`  Canvas size: ${rect.width}x${rect.height}`);
    console.log(`  Canvas visible: ${rect.width > 0 && rect.height > 0}`);
  }
  
  // Check location
  console.log('\n📍 Location Status:');
  try {
    const location = JSON.parse(localStorage.getItem('floq-debug-forceLoc') || 'null');
    console.log(`  Debug location: ${location ? location : 'not set'}`);
  } catch (e) {
    console.log(`  Debug location: error reading`);
  }
  
  // Check performance
  console.log('\n⚡ Performance:');
  console.log(`  WebGL contexts: ${performance.getEntriesByType('frame').filter(e => e.name?.includes('WebGL')).length}`);
  console.log(`  Canvas elements: ${document.querySelectorAll('.mapboxgl-canvas').length}`);
  
  console.log('\n✨ Quick fixes available:');
  console.log('  - window.quickMapFixes() - Apply common fixes');
  console.log('  - window.debugLocation.testLocation() - Test location permission');
  console.log('  - window.debugLocation.checkMapboxToken() - Verify token');
  
  console.log('\n=== END DIAGNOSTICS ===\n');
}

// Auto-setup in development
if (import.meta.env.DEV && typeof window !== 'undefined') {
  setTimeout(() => {
    (window as any).runMapDiagnostics = runMapDiagnostics;
    console.log('🔍 Comprehensive map diagnostics available: window.runMapDiagnostics()');
  }, 2000);
}