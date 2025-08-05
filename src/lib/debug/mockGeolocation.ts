/**
 * Mock Geolocation for Development
 * Bypasses browser permission prompts and provides instant coordinates
 */

const SF_COORDS = { latitude: 37.7749, longitude: -122.4194, accuracy: 30 };
const NY_COORDS = { latitude: 40.7128, longitude: -74.0060, accuracy: 30 };
const LA_COORDS = { latitude: 34.0522, longitude: -118.2437, accuracy: 30 };

function installMock(coords = SF_COORDS) {
  if (!('geolocation' in navigator)) {
    console.log('[mockGeo] ❌ Navigator.geolocation not available');
    return;
  }

  const geo: Geolocation = {
    getCurrentPosition: (success, _error, _options) => {
      console.log('[mockGeo] 📍 getCurrentPosition called, returning:', coords);
      success({ 
        coords: coords as GeolocationCoordinates, 
        timestamp: Date.now() 
      } as GeolocationPosition);
    },
    watchPosition: (success, _error, _options) => {
      console.log('[mockGeo] 👀 watchPosition called, setting up interval');
      const id = setInterval(() => {
        console.log('[mockGeo] 🔄 watchPosition update:', coords);
        success({ 
          coords: coords as GeolocationCoordinates, 
          timestamp: Date.now() 
        } as GeolocationPosition);
      }, 5000);
      return id as unknown as number;
    },
    clearWatch: (id: number) => {
      console.log('[mockGeo] 🛑 clearWatch called for:', id);
      clearInterval(id);
    },
  };

  // Store original for restoration
  (window as any).__ORIGINAL_GEOLOCATION = navigator.geolocation;
  
  // @ts-ignore – monkey-patching in dev only
  navigator.geolocation = geo;
  console.log('[mockGeo] ✅ Installed mock geolocation →', coords);
  
  // Trigger immediate update for existing hooks
  window.dispatchEvent(new CustomEvent('geolocation-mock-enabled', { 
    detail: { coords } 
  }));
}

function uninstallMock() {
  const original = (window as any).__ORIGINAL_GEOLOCATION;
  if (original) {
    // @ts-ignore
    navigator.geolocation = original;
    delete (window as any).__ORIGINAL_GEOLOCATION;
    console.log('[mockGeo] ✅ Restored original geolocation');
  } else {
    console.log('[mockGeo] ❌ No original geolocation to restore');
  }
  
  // Trigger update for existing hooks
  window.dispatchEvent(new CustomEvent('geolocation-mock-disabled'));
}

function isMockInstalled() {
  return !!(window as any).__ORIGINAL_GEOLOCATION;
}

// Quick presets
function enableSanFrancisco() {
  installMock(SF_COORDS);
}

function enableNewYork() {
  installMock(NY_COORDS);
}

function enableLosAngeles() {
  installMock(LA_COORDS);
}

function enableCustomLocation(lat: number, lng: number, accuracy = 30) {
  installMock({ latitude: lat, longitude: lng, accuracy });
}

if (import.meta.env.DEV) {
  // Setup console helpers
  setTimeout(() => {
    (window as any).enableMockGeo = installMock;
    (window as any).disableMockGeo = uninstallMock;
    (window as any).isMockGeoInstalled = isMockInstalled;
    
    // Location presets
    (window as any).mockGeoSF = enableSanFrancisco;
    (window as any).mockGeoNY = enableNewYork;
    (window as any).mockGeoLA = enableLosAngeles;
    (window as any).mockGeoCustom = enableCustomLocation;
    
    console.log('🌍 [Mock Geolocation] Available commands:');
    console.log('  - window.enableMockGeo() → San Francisco (default)');
    console.log('  - window.mockGeoSF() → San Francisco');
    console.log('  - window.mockGeoNY() → New York');  
    console.log('  - window.mockGeoLA() → Los Angeles');
    console.log('  - window.mockGeoCustom(lat, lng) → Custom coordinates');
    console.log('  - window.disableMockGeo() → Restore real GPS');
    console.log('  - window.isMockGeoInstalled() → Check if mock is active');
  }, 1000);
}