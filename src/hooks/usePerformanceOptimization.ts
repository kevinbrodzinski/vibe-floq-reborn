import { useEffect, useCallback, useRef, useState } from 'react';
import { useThrottledCallback } from 'use-debounce';
import * as React from 'react';

interface PerformanceMetrics {
  fps: number;
  memoryUsage: number;
  renderTime: number;
  componentCount: number;
}

export function usePerformanceOptimization() {
  const [shouldReduceMotion, setShouldReduceMotion] = useState(false);
  const frameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());
  const fpsRef = useRef<number[]>([]);
  const renderStartRef = useRef<number>(0);

  // FPS monitoring
  const updateFPS = useCallback(() => {
    const now = performance.now();
    const delta = now - lastTimeRef.current;
    
    if (delta > 0) {
      const fps = 1000 / delta;
      fpsRef.current.push(fps);
      
      // Keep only last 60 measurements
      if (fpsRef.current.length > 60) {
        fpsRef.current.shift();
      }
    }
    
    lastTimeRef.current = now;
    frameRef.current = requestAnimationFrame(updateFPS);
  }, []);

  // Start/stop FPS monitoring  
  useEffect(() => {
    frameRef.current = requestAnimationFrame(updateFPS);
    
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setShouldReduceMotion(mediaQuery.matches);
    
    const updateMotionPreference = (e: MediaQueryListEvent) => {
      setShouldReduceMotion(e.matches);
    };
    
    mediaQuery.addListener(updateMotionPreference);
    
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      mediaQuery.removeListener(updateMotionPreference);
    };
  }, [updateFPS]);

  // Throttled performance metrics collection
  const collectMetrics = useThrottledCallback((): PerformanceMetrics => {
    const avgFps = fpsRef.current.length > 0 
      ? fpsRef.current.reduce((a, b) => a + b, 0) / fpsRef.current.length 
      : 60;

    const memoryInfo = (performance as any).memory;
    const memoryUsage = memoryInfo ? 
      (memoryInfo.usedJSHeapSize / memoryInfo.totalJSHeapSize) * 100 : 0;

    const renderTime = performance.now() - renderStartRef.current;
    
    // Count DOM elements as proxy for component count
    const componentCount = document.querySelectorAll('[data-reactroot] *').length;

    return {
      fps: Math.round(avgFps),
      memoryUsage: Math.round(memoryUsage),
      renderTime: Math.round(renderTime * 100) / 100,
      componentCount
    };
  }, 1000); // Throttle to once per second

  // Performance optimization strategies
  const optimizeRendering = useCallback(() => {
    const metrics = collectMetrics();
    
    // Suggest optimizations based on metrics
    const suggestions = [];
    
    if (metrics.fps < 30) {
      suggestions.push('Consider reducing animation complexity');
    }
    
    if (metrics.memoryUsage > 70) {
      suggestions.push('Memory usage high - check for memory leaks');
    }
    
    if (metrics.renderTime > 16) {
      suggestions.push('Render time exceeding 60fps budget');
    }
    
    if (metrics.componentCount > 1000) {
      suggestions.push('Consider virtualizing large lists');
    }
    
    return suggestions;
  }, [collectMetrics]);

  // Mark render start for timing
  const markRenderStart = useCallback(() => {
    renderStartRef.current = performance.now();
  }, []);

  // Lazy loading helper
  const createLazyComponent = useCallback((importFn: () => Promise<any>) => {
    return React.lazy(() => 
      importFn().catch(() => ({ default: () => React.createElement('div', null, 'Failed to load') }))
    );
  }, []);

  // Intersection observer for lazy loading
  const createIntersectionObserver = useCallback((
    callback: (entries: IntersectionObserverEntry[]) => void,
    options?: IntersectionObserverInit
  ) => {
    if (typeof IntersectionObserver === 'undefined') {
      // Fallback for older browsers
      return {
        observe: () => {},
        unobserve: () => {},
        disconnect: () => {}
      };
    }

    return new IntersectionObserver(callback, {
      threshold: 0.1,
      rootMargin: '50px',
      ...options
    });
  }, []);

  // Animation frame scheduling
  const scheduleWork = useCallback((work: () => void, priority: 'high' | 'normal' | 'low' = 'normal') => {
    const delay = priority === 'high' ? 0 : priority === 'normal' ? 1 : 5;
    
    if (delay === 0) {
      requestAnimationFrame(work);
    } else {
      setTimeout(() => requestAnimationFrame(work), delay);
    }
  }, []);

  return {
    // Metrics
    collectMetrics,
    optimizeRendering,
    
    // Rendering helpers
    markRenderStart,
    createLazyComponent,
    createIntersectionObserver,
    scheduleWork,
    
    // Performance state
    shouldReduceMotion,
    getCurrentFPS: () => fpsRef.current.length > 0 
      ? fpsRef.current.reduce((a, b) => a + b, 0) / fpsRef.current.length 
      : 60,
    
    // Performance warnings
    isPerformanceCritical: () => {
      const metrics = collectMetrics();
      return metrics.fps < 20 || metrics.memoryUsage > 80;
    }
  };
}
