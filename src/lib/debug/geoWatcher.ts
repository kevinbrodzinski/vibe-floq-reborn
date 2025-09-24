/**
 * Debug utility to watch useGeo setValue calls
 * Run this in console before map loads to track coordinates flow
 */

export function setupGeoWatcher() {
  if (typeof window === 'undefined') return;
  
  // Set up watcher for useGeo setValue calls
  Object.defineProperty(window, '__watch', {
    set(v) { 
      console.log('[🔧 GeoWatcher] useGeo setValue called with:', v); 
    },
    configurable: true
  });
  
  console.log('[🔧 GeoWatcher] Monitoring useGeo setValue calls. Use (window as any).__watch = value in useGeo.');
}

// Auto-setup in development
if (import.meta.env.DEV) {
  setupGeoWatcher();
}