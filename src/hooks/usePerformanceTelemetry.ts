import { useRef, useCallback } from 'react';

interface PerformanceMetrics {
  calcMs: number;
  intervalMs: number;
  cacheHits: {
    venue: number;
    weather: number;
    patterns: number;
  };
  patternComputeMs?: number;
}

interface TelemetryOptions {
  logThreshold?: number; // Only log if calcMs > threshold
  enableInProduction?: boolean;
}

/**
 * Hook for tracking vibe engine performance metrics
 */
export function usePerformanceTelemetry(options: TelemetryOptions = {}) {
  const metricsRef = useRef<PerformanceMetrics>({
    calcMs: 0,
    intervalMs: 0,
    cacheHits: { venue: 0, weather: 0, patterns: 0 }
  });
  
  const logThreshold = options.logThreshold || 80;
  const shouldLog = import.meta.env.DEV || options.enableInProduction;

  const recordMetrics = useCallback((metrics: Partial<PerformanceMetrics>) => {
    // Update metrics
    Object.assign(metricsRef.current, metrics);
    
    // Log if above threshold and in dev mode
    if (shouldLog && metrics.calcMs && metrics.calcMs > logThreshold) {
      console.warn('[VibeEngine Performance]', {
        calcMs: metrics.calcMs,
        intervalMs: metrics.intervalMs,
        cacheHits: metricsRef.current.cacheHits,
        patternComputeMs: metrics.patternComputeMs,
        timestamp: new Date().toISOString()
      });
    }
  }, [shouldLog, logThreshold]);

  const incrementCacheHit = useCallback((type: keyof PerformanceMetrics['cacheHits']) => {
    metricsRef.current.cacheHits[type]++;
  }, []);

  const getMetrics = useCallback(() => ({ ...metricsRef.current }), []);

  const resetMetrics = useCallback(() => {
    metricsRef.current = {
      calcMs: 0,
      intervalMs: 0,
      cacheHits: { venue: 0, weather: 0, patterns: 0 }
    };
  }, []);

  return {
    recordMetrics,
    incrementCacheHit,
    getMetrics,
    resetMetrics
  };
}