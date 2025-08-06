/**
 * Immediate location fix for debugging and development
 * Sets a debug location right now to unblock the location system
 */

export function setDebugLocationNow(lat: number = 37.7749, lng: number = -122.4194) {
  console.log('🔧 Setting debug location immediately:', { lat, lng });
  
  // Set localStorage flag
  localStorage.setItem('floq-debug-forceLoc', `${lat},${lng}`);
  
  // Trigger location system refresh
  window.dispatchEvent(new CustomEvent('floq-location-debug-set', { 
    detail: { lat, lng } 
  }));
  
  console.log('✅ Debug location set. The location system should now activate.');
  
  return { lat, lng };
}

// Auto-setup for Lovable development environment
if (import.meta.env.DEV && typeof window !== 'undefined') {
  // Clear any existing debug location on load
  if (localStorage.getItem('floq-debug-forceLoc')) {
    console.log('🧹 Clearing debug location to use real GPS...');
    localStorage.removeItem('floq-debug-forceLoc');
  }
  
  // Make available globally for manual debugging
  (window as any).setDebugLocationNow = setDebugLocationNow;
  
  console.log('🌍 Debug location helper available: window.setDebugLocationNow()');
}