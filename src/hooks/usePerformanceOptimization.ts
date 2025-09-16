import { useEffect, useRef, useCallback } from 'react';

interface PerformanceOptions {
  enableParticles?: boolean;
  enableAnimations?: boolean;
  enableHeavyVisuals?: boolean;
  throttleMs?: number;
}

export function usePerformanceOptimization(options: PerformanceOptions = {}) {
  const {
    enableParticles = true,
    enableAnimations = true,
    enableHeavyVisuals = true,
    throttleMs = 16 // ~60fps
  } = options;
  
  const frameRef = useRef<number>();
  const lastCallRef = useRef<number>(0);

  // Detect reduced motion preference
  const prefersReducedMotion = typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  // Detect low-end devices (simplified heuristic)
  const isLowEndDevice = typeof navigator !== 'undefined' 
    ? navigator.hardwareConcurrency <= 2 || /Mobile|Android/i.test(navigator.userAgent)
    : false;

  // Performance-aware settings
  const optimizedSettings = {
    particles: enableParticles && !prefersReducedMotion && !isLowEndDevice,
    animations: enableAnimations && !prefersReducedMotion,
    heavyVisuals: enableHeavyVisuals && !isLowEndDevice,
    reducedComplexity: prefersReducedMotion || isLowEndDevice
  };

  // Throttled animation frame
  const throttledRAF = useCallback((callback: () => void) => {
    const now = performance.now();
    if (now - lastCallRef.current >= throttleMs) {
      lastCallRef.current = now;
      callback();
    }
    frameRef.current = requestAnimationFrame(() => throttledRAF(callback));
  }, [throttleMs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  return {
    ...optimizedSettings,
    throttledRAF,
    prefersReducedMotion,
    isLowEndDevice
  };
}