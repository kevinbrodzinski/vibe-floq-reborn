import { layerManager } from '@/lib/map/LayerManager';
import { attachLmApplyLog } from '@/lib/map/dev/lmApplyLog';

/**
 * Initialize dev logging for LayerManager
 * Call this once in your app bootstrap (dev mode only)
 */
export function initDevLogging() {
  if (import.meta.env.DEV) {
    // Attach apply logging with reasonable defaults
    const unsubscribe = attachLmApplyLog(layerManager, { 
      thresholdBytes: 150_000,
      logSkipped: false 
    });
    
    // Optional: Add visibility change listener for low-power mode
    const handleVisibilityChange = () => {
      layerManager.setLowPower(document.hidden);
    };
    
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange, { passive: true });
      handleVisibilityChange(); // Set initial state
    }
    
    // Return cleanup function
    return () => {
      unsubscribe();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }
  
  return () => {}; // no-op cleanup
}