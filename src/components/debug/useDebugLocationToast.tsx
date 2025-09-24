import { useEffect, useState } from 'react';
import { toast } from 'sonner';

/**
 * Debug Location Toast Hook
 * Shows a non-blocking toast when debug location is active with option to clear
 */
export function useDebugLocationToast() {
  const [isDebugActive, setIsDebugActive] = useState(false);

  useEffect(() => {
    const checkDebugLocation = () => {
      const debugLoc = localStorage.getItem('floq-debug-forceLoc');
      const wasActive = isDebugActive;
      const nowActive = !!debugLoc;
      
      setIsDebugActive(nowActive);
      
      // Show toast when debug location becomes active
      if (nowActive && !wasActive) {
        const [lat, lng] = debugLoc.split(',').map(Number);
        
        toast('Debug Location Active', {
          description: `Using forced coordinates: ${lat?.toFixed(4)}, ${lng?.toFixed(4)}`,
          action: {
            label: 'Clear',
            onClick: () => {
              localStorage.removeItem('floq-debug-forceLoc');
              sessionStorage.removeItem('floq-coords');
              toast.success('Debug location cleared - reloading...');
              setTimeout(() => window.location.reload(), 500);
            }
          },
          duration: Infinity, // Keep visible until manually dismissed
          id: 'debug-location-toast' // Prevent duplicates
        });
      }
      
      // Dismiss toast when debug location is cleared externally
      if (!nowActive && wasActive) {
        toast.dismiss('debug-location-toast');
      }
    };

    // Check immediately
    checkDebugLocation();
    
    // Check periodically in case localStorage changes from other tabs/components
    const interval = setInterval(checkDebugLocation, 1000);
    
    // Listen for storage events from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'floq-debug-forceLoc') {
        checkDebugLocation();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
      toast.dismiss('debug-location-toast');
    };
  }, [isDebugActive]);

  return {
    isDebugActive,
    clearDebugLocation: () => {
      localStorage.removeItem('floq-debug-forceLoc');
      sessionStorage.removeItem('floq-coords');
      window.location.reload();
    }
  };
}