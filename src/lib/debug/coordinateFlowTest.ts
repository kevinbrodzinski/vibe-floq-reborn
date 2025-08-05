/**
 * Coordinate Flow Testing Utility
 * Copy-paste this into the browser console to verify each stage
 */

export function runCoordinateFlowTest() {
  console.log('🔧 === COORDINATE FLOW DEBUGGING TEST ===');
  
  let testResults = {
    stage1: '❌',
    stage2: '❌', 
    stage3: '❌',
    stage4a: '❌',
    stage4b: '❌',
    stage5: '❌',
    stage6: '❌'
  };

  // Stage 1: useGeo
  console.log('\n📍 Stage 1: useGeo');
  const geoDebug = (window as any).__FLOQ_DEBUG_LAST_GEO;
  if (geoDebug?.coords?.lat && geoDebug?.coords?.lng && geoDebug?.status === 'ready') {
    console.log('✅ useGeo working:', geoDebug.coords);
    testResults.stage1 = '✅';
  } else {
    console.log('❌ useGeo failed:', geoDebug);
  }

  // Stage 2: Check for FLP outgoing logs
  console.log('\n🔄 Stage 2: FieldLocationProvider');
  console.log('⚠️  Check console for "FLP outgoing ready {lat: X, lng: Y}" message');
  console.log('   This should appear once on reload with matching coordinates');
  testResults.stage2 = '⚠️  Manual check';

  // Stage 3: filteredPeople
  console.log('\n👥 Stage 3: FieldWebMap → filteredPeople');
  console.log('⚠️  Check console for filteredPeople table with you: true');
  console.log('   Should have at least one row with correct lat/lng and you: true');
  testResults.stage3 = '⚠️  Manual check';

  // Stage 4: Mapbox sources
  console.log('\n🗺️  Stage 4: Mapbox Sources');
  const map = (window as any).__FLOQ_MAP;
  if (map) {
    // Check user-location source
    try {
      const userLocationSource = map.getSource('user-location');
      const userFeatures = userLocationSource?._data?.features;
      if (userFeatures?.length > 0) {
        console.log('✅ user-location source has features:', userFeatures.length);
        testResults.stage4a = '✅';
      } else {
        console.log('❌ user-location source empty or missing:', userFeatures);
      }
    } catch (e) {
      console.log('❌ user-location source error:', e);
    }

    // Check people source  
    try {
      const peopleSource = map.getSource('people');
      const peopleFeatures = peopleSource?._data?.features;
      if (peopleFeatures?.length > 0) {
        console.log('✅ people source has features:', peopleFeatures.length);
        testResults.stage4b = '✅';
      } else {
        console.log('❌ people source empty or missing:', peopleFeatures);
      }
    } catch (e) {
      console.log('❌ people source error:', e);
    }
  } else {
    console.log('❌ Map instance not found');
  }

  // Stage 5: Layers present
  console.log('\n🎨 Stage 5: Map Layers');
  if (map) {
    try {
      const layers = map.getStyle().layers.filter((l: any) => 
        l.id.includes('user-location')
      );
      const layerIds = layers.map((l: any) => l.id);
      
      if (layerIds.includes('user-location-accuracy') && layerIds.includes('user-location-dot')) {
        console.log('✅ User location layers present:', layerIds);
        testResults.stage5 = '✅';
      } else {
        console.log('❌ Missing user location layers. Found:', layerIds);
      }
    } catch (e) {
      console.log('❌ Layer check error:', e);
    }
  }

  // Stage 6: Rendered artifacts
  console.log('\n🎯 Stage 6: Visual Rendering');
  console.log('⚠️  Manual check: Can you see blue accuracy ring + blue dot on map?');
  console.log('   If not, try: window.__FLOQ_MAP.showCollisionBoxes = true');
  testResults.stage6 = '⚠️  Manual check';

  // Summary
  console.log('\n📊 === TEST RESULTS SUMMARY ===');
  Object.entries(testResults).forEach(([stage, result]) => {
    console.log(`${stage}: ${result}`);
  });

  console.log('\n🔧 === DEBUGGING HELPERS ===');
  console.log('Run these commands for deeper debugging:');
  console.log('window.__FLOQ_MAP.getSource("user-location")._data.features');
  console.log('window.__FLOQ_MAP.getSource("people")._data.features');
  console.log('window.__FLOQ_MAP.showCollisionBoxes = true');
  console.log('window.__FLOQ_DEBUG_LAST_GEO');

  return testResults;
}

// Auto-run in development
if (import.meta.env.DEV) {
  // Run test after map likely loads
  setTimeout(() => {
    if (typeof window !== 'undefined') {
      (window as any).runCoordinateFlowTest = runCoordinateFlowTest;
      console.log('🔧 [CoordinateFlowTest] Available as window.runCoordinateFlowTest()');
    }
  }, 5000);
}