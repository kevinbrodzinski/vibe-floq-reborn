/**
 * Quick map fixes for immediate debugging
 * Auto-runs common fixes when map appears black/empty
 */

export function quickMapFixes() {
  const map = (window as any).__FLOQ_MAP;
  
  if (!map) {
    console.log('❌ Map not available yet. Wait for map to load first.');
    return;
  }
  
  console.log('🔧 Applying quick map fixes...\n');
  
  // Fix 1: Force resize (common cause of black map)
  console.log('1. 📐 Forcing map resize...');
  map.resize();
  
  // Fix 2: Set debug location if not already set
  console.log('2. 📍 Ensuring debug location is set...');
  if (!localStorage.getItem('floq-debug-forceLoc')) {
    localStorage.setItem('floq-debug-forceLoc', '37.7749,-122.4194');
    console.log('   ✅ Debug location set to San Francisco');
  } else {
    console.log('   ✅ Debug location already set');
  }
  
  // Fix 3: Force center on San Francisco
  console.log('3. 🌍 Forcing center to San Francisco...');
  map.jumpTo({
    center: [-122.4194, 37.7749],
    zoom: 12
  });
  
  // Fix 4: Add visible border to canvas for debugging
  console.log('4. 🎯 Adding red border to canvas...');
  map.getCanvas().style.border = '2px solid red';
  
  // Fix 5: Force container height
  console.log('5. 📏 Ensuring root container has height...');
  const root = document.querySelector('#root') as HTMLElement;
  if (root) {
    root.style.height = '100%';
    console.log('   ✅ Root height set to 100%');
  }
  
  // Fix 6: Check and log current status
  console.log('\n📊 Current map status:');
  console.log(`   Style loaded: ${map.isStyleLoaded()}`);
  console.log(`   Center: [${map.getCenter().lng.toFixed(4)}, ${map.getCenter().lat.toFixed(4)}]`);
  console.log(`   Zoom: ${map.getZoom().toFixed(1)}`);
  
  const rect = map.getCanvas().getBoundingClientRect();
  console.log(`   Canvas size: ${rect.width}x${rect.height}`);
  
  console.log('\n✅ Quick fixes applied! Check if map is now visible.');
  console.log('💡 Run window.runMapDiagnostics() for detailed analysis.');
}

// Auto-setup in development
if (import.meta.env.DEV && typeof window !== 'undefined') {
  setTimeout(() => {
    (window as any).quickMapFixes = quickMapFixes;
    console.log('🔧 Quick map fixes available: window.quickMapFixes()');
    
    // Auto-run after a delay to catch common issues
    setTimeout(() => {
      const map = (window as any).__FLOQ_MAP;
      if (map) {
        const rect = map.getCanvas().getBoundingClientRect();
        // If canvas has zero height, auto-run fixes
        if (rect.height === 0) {
          console.log('🔧 Detected zero-height canvas, auto-running fixes...');
          quickMapFixes();
        }
      }
    }, 3000);
  }, 1000);
}