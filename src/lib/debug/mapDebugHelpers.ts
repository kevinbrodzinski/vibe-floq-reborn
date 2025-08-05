// 🔧 MAP DEBUG HELPERS - Auto-loaded in development mode

// Extend window interface for TypeScript
declare global {
  interface Window {
    __mountPing?: boolean;
    checkContainerHeight?: () => void;
    checkMapboxWorker?: () => void;
    realityCheckMapbox?: () => Promise<void>;
    quickContainerCheck?: () => void;
    mapboxgl?: any;
  }
}

// Test 1: Check if mount ping works
console.log('[DEBUG 1] Mount ping check:', !!(window as any).__mountPing);

// Test 2: Check container height chain
function checkContainerHeight() {
  const container = document.querySelector('[data-map-container]') || 
                   document.querySelector('.mapbox-container') || 
                   document.querySelector('#map') ||
                   document.querySelector('.absolute.inset-0');
  
  if (!container) {
    console.log('[DEBUG 2] ❌ Container not found');
    return;
  }
  
  console.log('[DEBUG 2] Container height chain:');
  let el = container as HTMLElement;
  while (el && el !== document.body) {
    const height = getComputedStyle(el).height;
    const display = getComputedStyle(el).display;
    console.log(`  ${el.className || el.tagName}: height=${height}, display=${display}`);
    if (height === '0px') {
      console.log(`  ❌ FOUND ZERO HEIGHT ELEMENT: ${el.className || el.tagName}`);
      break;
    }
    el = el.parentElement as HTMLElement;
  }
}

// Test 3: Check Mapbox worker registration  
function checkMapboxWorker() {
  console.log('[DEBUG 3] Mapbox worker check:');
  console.log('  Worker count:', (window as any).mapboxgl?.workerCount ?? 'undefined');
  console.log('  Worker class:', (window as any).mapboxgl?.workerClass ? 'defined' : 'undefined');
}

// Reality check function - test raw Mapbox
async function realityCheckMapbox() {
  console.log('[REALITY CHECK] Testing raw Mapbox...');
  try {
    // Use dynamic import with proper typing
    const mapboxModule = await import('mapbox-gl');
    const mapboxgl = mapboxModule.default;
    
    mapboxgl.accessToken = 'pk.eyJ1Ijoia2V2aW5icm9kemluc2tpIiwiYSI6ImNtY25paHJoZzA4cnIyaW9ic2h0OTM3Z3QifQ._NbZi04NXvHoJsU12sul2A';
    
    const testDiv = document.createElement('div');
    testDiv.style.cssText = 'position:fixed;inset:0 0 50% 0;z-index:9999;background:rgba(255,0,0,0.1);';
    testDiv.textContent = 'Testing Mapbox...';
    document.body.appendChild(testDiv);
    
    const map = new mapboxgl.Map({
      container: testDiv,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-122.4194, 37.7749],
      zoom: 10
    });
    
    map.on('load', () => {
      console.log('🔥 Reality check ad-hoc map loaded successfully!');
      setTimeout(() => testDiv.remove(), 5000); // Remove after 5 seconds
    });
    
    map.on('error', (e) => {
      console.error('❌ Reality check map error:', e);
      testDiv.remove();
    });
    
  } catch (error) {
    console.error('❌ Reality check failed:', error);
  }
}

// Auto-setup in development
if (import.meta.env.DEV && typeof window !== 'undefined') {
  setTimeout(() => {
    // Attach functions to window
    window.checkContainerHeight = checkContainerHeight;
    window.checkMapboxWorker = checkMapboxWorker;
    window.realityCheckMapbox = realityCheckMapbox;
    
    // Add instant container check function
    (window as any).quickContainerCheck = () => {
      const c = document.querySelector('[data-map-container]');
      if (c) {
        console.log('✅ Container exists in DOM:', c);
        const rect = c.getBoundingClientRect();
        console.log('📐 Container size:', { width: rect.width, height: rect.height });
        console.log('🎨 Container styles:', {
          display: getComputedStyle(c).display,
          height: getComputedStyle(c).height,
          position: getComputedStyle(c).position
        });
      } else {
        console.warn('❌ Container missing from DOM');
      }
      
      console.log('🔄 Mount ping status:', !!(window as any).__mountPing);
      console.log('🗺️ Map instance exists:', !!(window as any).__FLOQ_MAP);
      console.log('🎯 Canvas count:', document.querySelectorAll('.mapboxgl-canvas').length);
    };
    
    console.log('🔧 Map debug helpers loaded:');
    console.log('  - window.quickContainerCheck() - Instant status check'); 
    console.log('  - window.checkContainerHeight() - Check if any parent has 0px height');
    console.log('  - window.checkMapboxWorker() - Check if Mapbox worker is registered');  
    console.log('  - window.realityCheckMapbox() - Test if Mapbox works at all');
    console.log('  - Run these in console to debug map loading issues');
  }, 2000);
}