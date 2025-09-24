/**
 * Debug utilities for location troubleshooting
 */

export function checkDebugLocation() {
  const debugLoc = localStorage.getItem('floq-debug-forceLoc');
  if (debugLoc) {
    console.warn('🐛 Debug location is active:', debugLoc);
    console.warn('This may be overriding your real location!');
    return debugLoc;
  }
  return null;
}

export function clearDebugLocation() {
  localStorage.removeItem('floq-debug-forceLoc');
  sessionStorage.removeItem('floq-coords');
  console.log('✅ Debug location cleared');
}

export function clearAllLocationStorage() {
  // Clear all location-related localStorage/sessionStorage
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.includes('location') || key.includes('geo') || key.includes('coords') || key.includes('floq-debug')) {
      localStorage.removeItem(key);
      console.log('🧹 Cleared:', key);
    }
  });
  
  const sessionKeys = Object.keys(sessionStorage);
  sessionKeys.forEach(key => {
    if (key.includes('location') || key.includes('geo') || key.includes('coords') || key.includes('floq-debug')) {
      sessionStorage.removeItem(key);
      console.log('🧹 Cleared session:', key);
    }
  });
  
  console.log('✅ All location storage cleared');
}

export function debugLocationInfo() {
  console.group('🔍 Location Debug Info');
  
  // Check debug location
  const debugLoc = checkDebugLocation();
  if (debugLoc) {
    console.warn('❌ Debug location active:', debugLoc);
  } else {
    console.log('✅ No debug location set');
  }
  
  // Check permissions
  if ('permissions' in navigator) {
    navigator.permissions.query({ name: 'geolocation' as PermissionName })
      .then(result => {
        console.log('📍 Geolocation permission:', result.state);
      })
      .catch(err => {
        console.warn('❌ Could not check permissions:', err);
      });
  }
  
  // Check geolocation support
  if ('geolocation' in navigator) {
    console.log('✅ Geolocation API supported');
  } else {
    console.error('❌ Geolocation API not supported');
  }
  
  console.groupEnd();
}

export function debugMapLocation() {
  const map = (window as any).__FLOQ_MAP;
  if (!map) {
    console.error('❌ No map instance found. Make sure map is loaded.');
    return;
  }
  
  console.group('🗺️ Map Location Debug');
  
  // Check map state
  console.log('Map state:', {
    isStyleLoaded: map.isStyleLoaded(),
    hasUserLocationSource: !!map.getSource('user-location'),
    hasUserLocationLayer: !!map.getLayer('user-location-dot'),
    readyCheck: map.__userLocationSourceReady?.()
  });
  
  // Check source data
  const source = map.getSource('user-location');
  if (source) {
    console.log('User location source data:', source._data);
  }
  
  console.groupEnd();
}

// Make functions available globally for easy debugging
if (typeof window !== 'undefined') {
  (window as any).floqDebug = {
    checkDebugLocation,
    clearDebugLocation,
    clearAllLocationStorage,
    debugLocationInfo,
    debugMapLocation
  };
}