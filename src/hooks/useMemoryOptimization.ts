import { useEffect, useRef } from 'react';

export function useMemoryOptimization() {
  const mountedRef = useRef(true);
  const cleanupFunctions = useRef<Array<() => void>>([]);

  // Register cleanup function
  const addCleanup = (cleanup: () => void) => {
    cleanupFunctions.current.push(cleanup);
  };

  // Component cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      cleanupFunctions.current.forEach(cleanup => {
        try {
          cleanup();
        } catch (error) {
          console.warn('Cleanup function failed:', error);
        }
      });
      cleanupFunctions.current = [];
    };
  }, []);

  // Memory pressure monitoring
  useEffect(() => {
    const handleMemoryWarning = () => {
      // Force garbage collection if available (Chrome DevTools)
      if ('gc' in window && typeof window.gc === 'function') {
        window.gc();
      }
      
      // Clear unused query cache data
      setTimeout(() => {
        const event = new CustomEvent('memoryPressure');
        window.dispatchEvent(event);
      }, 100);
    };

    // Listen for memory warnings on mobile
    if ('memory' in performance && (performance as any).memory) {
      const checkMemory = () => {
        const memory = (performance as any).memory;
        const usageRatio = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
        
        if (usageRatio > 0.8) {
          handleMemoryWarning();
        }
      };

      const memoryInterval = setInterval(checkMemory, 30000); // Check every 30s
      addCleanup(() => clearInterval(memoryInterval));
    }

    // iOS memory warning simulation
    const memoryWarningListener = () => handleMemoryWarning();
    window.addEventListener('pagehide', memoryWarningListener);
    addCleanup(() => window.removeEventListener('pagehide', memoryWarningListener));
  }, []);

  return {
    isMounted: () => mountedRef.current,
    addCleanup,
  };
}