// src/lib/debug/fieldOverlayTestData.ts
// Test data script for Field GL overlay - run in browser console

let overlayBridge: any = null;
try {
  overlayBridge = require('@/lib/field/overlayBridge');
} catch (error) {
  console.warn('[FieldOverlayTest] Overlay bridge not available:', error);
}

export function injectFieldTestData() {
  console.log('🎯 Injecting Field GL overlay test data...');
  
  // Generate test points around current map center
  const generateTestPoints = () => {
    // Get current map center or default to SF
    const map = (window as any).__fieldMap || null;
    const center = map?.getCenter() || { lng: -122.4194, lat: 37.7749 };
    
    const points = [];
    const vibes = ['social', 'hype', 'chill', 'curious', 'romantic', 'weird', 'flowing'];
    
    // Create clusters of points for testing clustering
    for (let cluster = 0; cluster < 5; cluster++) {
      const clusterCenterLat = center.lat + (Math.random() - 0.5) * 0.02;
      const clusterCenterLng = center.lng + (Math.random() - 0.5) * 0.02;
      
      // 3-8 points per cluster
      const clusterSize = 3 + Math.floor(Math.random() * 6);
      
      for (let i = 0; i < clusterSize; i++) {
        const id = `test-${cluster}-${i}`;
        const lat = clusterCenterLat + (Math.random() - 0.5) * 0.003;
        const lng = clusterCenterLng + (Math.random() - 0.5) * 0.003;
        const vibe = vibes[Math.floor(Math.random() * vibes.length)];
        const isFriend = Math.random() > 0.6; // 40% chance of being a friend
        
        points.push({
          id,
          lat,
          lng,
          vibe,
          isFriend,
          // Mark one point as "you" for testing
          isYou: cluster === 0 && i === 0,
        });
      }
    }
    
    // Add some scattered individual points
    for (let i = 0; i < 15; i++) {
      const id = `scattered-${i}`;
      const lat = center.lat + (Math.random() - 0.5) * 0.05;
      const lng = center.lng + (Math.random() - 0.5) * 0.05;
      const vibe = vibes[Math.floor(Math.random() * vibes.length)];
      const isFriend = Math.random() > 0.7; // 30% chance of being a friend
      
      points.push({
        id,
        lat,
        lng,
        vibe,
        isFriend,
      });
    }
    
    console.log(`✅ Generated ${points.length} test points`);
    console.log(`👥 Friends: ${points.filter(p => p.isFriend).length}`);
    console.log(`📍 "You" marker: ${points.filter(p => p.isYou).length}`);
    
    return points;
  };
  
  // Inject the test data
  const testPoints = generateTestPoints();
  if (overlayBridge) {
    overlayBridge.setFieldOverlayProvider(() => testPoints);
    overlayBridge.notifyFieldOverlayChanged();
  } else {
    console.error('❌ Overlay bridge not available - cannot inject test data');
    return null;
  }
  
  console.log('🎯 Test data injected! You should see:');
  console.log('- Colored dots representing people');
  console.log('- Pulsing halos around friends');
  console.log('- A "you" pin marker (teardrop shape)');
  console.log('- Clusters when zoomed out (< zoom level 12)');
  console.log('- Individual points when zoomed in (> zoom level 12)');
  
  return testPoints;
}

export function clearFieldTestData() {
  console.log('🧹 Clearing Field GL overlay test data...');
  if (overlayBridge) {
    overlayBridge.setFieldOverlayProvider(() => []);
    overlayBridge.notifyFieldOverlayChanged();
    console.log('✅ Test data cleared');
  } else {
    console.error('❌ Overlay bridge not available - cannot clear test data');
  }
}

export function addRandomPoint() {
  const map = (window as any).__fieldMap || null;
  const center = map?.getCenter() || { lng: -122.4194, lat: 37.7749 };
  const vibes = ['social', 'hype', 'chill', 'curious', 'romantic', 'weird', 'flowing'];
  
  const newPoint = {
    id: `random-${Date.now()}`,
    lat: center.lat + (Math.random() - 0.5) * 0.01,
    lng: center.lng + (Math.random() - 0.5) * 0.01,
    vibe: vibes[Math.floor(Math.random() * vibes.length)],
    isFriend: Math.random() > 0.5,
  };
  
  // Get current data and add new point
  if (overlayBridge) {
    const currentProvider = (window as any).__fieldOverlayProvider;
    if (currentProvider) {
      const currentPoints = currentProvider();
      overlayBridge.setFieldOverlayProvider(() => [...currentPoints, newPoint]);
      overlayBridge.notifyFieldOverlayChanged();
      console.log('➕ Added random point:', newPoint);
    }
  } else {
    console.error('❌ Overlay bridge not available - cannot add point');
  }
  
  return newPoint;
}

// Auto-expose to window for easy console access
if (typeof window !== 'undefined') {
  (window as any).fieldOverlayTest = {
    inject: injectFieldTestData,
    clear: clearFieldTestData,
    addRandom: addRandomPoint,
  };
  
  console.log('🎯 Field overlay test functions available:');
  console.log('- window.fieldOverlayTest.inject() - Add test data');
  console.log('- window.fieldOverlayTest.clear() - Clear test data');
  console.log('- window.fieldOverlayTest.addRandom() - Add random point');
}