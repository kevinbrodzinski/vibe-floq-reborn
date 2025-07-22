import { useEffect } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

// Enhanced haptic feedback for execution phase
export const useExecutionHaptics = () => {
  const checkInHaptic = async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (error) {
      // Gracefully degrade if haptics not available
      console.log('Haptics not available');
    }
  };

  const stopAdvanceHaptic = async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch (error) {
      console.log('Haptics not available');
    }
  };

  const afterglowHaptic = async () => {
    try {
      // Double tap pattern for afterglow
      await Haptics.impact({ style: ImpactStyle.Light });
      setTimeout(async () => {
        await Haptics.impact({ style: ImpactStyle.Light });
      }, 100);
    } catch (error) {
      console.log('Haptics not available');
    }
  };

  return {
    checkInHaptic,
    stopAdvanceHaptic,
    afterglowHaptic,
  };
};

// Mobile-optimized gesture handling for execution
export const useMobileExecutionGestures = () => {
  useEffect(() => {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      touchEndX = e.changedTouches[0].clientX;
      touchEndY = e.changedTouches[0].clientY;
      handleSwipe();
    };

    const handleSwipe = () => {
      const swipeThreshold = 50;
      const swipeDistanceX = touchEndX - touchStartX;
      const swipeDistanceY = touchEndY - touchStartY;

      // Horizontal swipes for navigation
      if (Math.abs(swipeDistanceX) > swipeThreshold && Math.abs(swipeDistanceY) < Math.abs(swipeDistanceX)) {
        if (swipeDistanceX > 0) {
          // Swipe right - previous stop (if available)
          dispatchEvent(new CustomEvent('execution-swipe-right'));
        } else {
          // Swipe left - next stop
          dispatchEvent(new CustomEvent('execution-swipe-left'));
        }
      }

      // Vertical swipes for actions
      if (Math.abs(swipeDistanceY) > swipeThreshold && Math.abs(swipeDistanceX) < Math.abs(swipeDistanceY)) {
        if (swipeDistanceY < 0) {
          // Swipe up - quick check-in
          dispatchEvent(new CustomEvent('execution-swipe-up'));
        } else {
          // Swipe down - show plan overview
          dispatchEvent(new CustomEvent('execution-swipe-down'));
        }
      }
    };

    // Add touch listeners
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);
};

// Offline mode handling for execution state
export const useOfflineExecutionState = (planId: string) => {
  const getOfflineState = () => {
    try {
      const saved = localStorage.getItem(`offline-execution-${planId}`);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  };

  const saveOfflineState = (state: any) => {
    try {
      localStorage.setItem(`offline-execution-${planId}`, JSON.stringify({
        ...state,
        timestamp: Date.now(),
      }));
    } catch (error) {
      console.error('Failed to save offline state:', error);
    }
  };

  const syncOfflineState = async () => {
    const offlineState = getOfflineState();
    if (!offlineState) return false;

    try {
      // In a real implementation, sync with Supabase when connection is restored
      console.log('Syncing offline state:', offlineState);
      localStorage.removeItem(`offline-execution-${planId}`);
      return true;
    } catch (error) {
      console.error('Failed to sync offline state:', error);
      return false;
    }
  };

  return {
    getOfflineState,
    saveOfflineState,
    syncOfflineState,
  };
};

// Performance optimization for execution components
export const useExecutionPerformance = () => {
  useEffect(() => {
    // Prevent unnecessary re-renders during execution
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-viewport');
          } else {
            entry.target.classList.remove('in-viewport');
          }
        });
      },
      { threshold: 0.1 }
    );

    // Observe execution components for performance optimization
    const executionComponents = document.querySelectorAll('[data-execution-component]');
    executionComponents.forEach((component) => observer.observe(component));

    return () => observer.disconnect();
  }, []);

  // Debounced update function for frequent updates
  const debouncedUpdate = (fn: Function, delay = 300) => {
    let timeoutId: ReturnType<typeof setTimeout>;
    return (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), delay);
    };
  };

  return {
    debouncedUpdate,
  };
};