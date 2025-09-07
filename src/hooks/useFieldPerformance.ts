import { useState, useEffect, useMemo, useRef } from 'react';
import * as PIXI from 'pixi.js';
import { PERF_BUDGETS, P3, P3B } from '@/lib/field/constants';

interface PerformanceMetrics {
  fps: number;
  workerTime: number;
  renderTime: number;
  drawCalls: number;
  particleCount: number;
  clusterCount: number;
  deviceTier: 'low' | 'mid' | 'high';
}

// Device tier detection
function useDeviceTier(): 'low' | 'mid' | 'high' {
  return useMemo(() => {
    const cores = navigator.hardwareConcurrency || 4;
    const memory = (navigator as any).deviceMemory || 4;
    
    // Simple GPU tier detection via WebGL capabilities
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    let gpu: 'low' | 'mid' | 'high' = 'mid';
    
    if (gl) {
      const renderer = gl.getParameter(gl.RENDERER)?.toLowerCase() || '';
      if (renderer.includes('adreno') && renderer.includes('3')) gpu = 'low';
      else if (renderer.includes('mali') && !renderer.includes('g7')) gpu = 'low';
      else if (renderer.includes('intel') && renderer.includes('hd')) gpu = 'low';
      else if (renderer.includes('nvidia') || renderer.includes('radeon')) gpu = 'high';
    }
    
    if (cores <= 4 || memory <= 4 || gpu === 'low') return 'low';
    if (cores >= 8 && memory >= 8 && gpu === 'high') return 'high';
    return 'mid';
  }, []);
}

let getActiveParticleCount = () => 0;
let getClusterCount = () => 0;

export function setPerformanceCounters(
  particleCounter: () => number,
  clusterCounter: () => number
) {
  getActiveParticleCount = particleCounter;
  getClusterCount = clusterCounter;
}

export function useFieldPerformance(app: PIXI.Application | null) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>();
  const deviceTier = useDeviceTier();
  
  // Stable refs to prevent re-registration
  const onTickRef = useRef<() => void>(() => {});
  const workerTimeAccum = useRef(0);
  const sampleCount = useRef(0);

  // Update tick handler when deviceTier changes
  useEffect(() => {
    let frames = 0;
    onTickRef.current = () => {
      frames++;
      if (frames % 60 === 0) {
        const stats: PerformanceMetrics = {
          fps: Math.round(app?.ticker?.FPS ?? 0),
          workerTime: sampleCount.current ? workerTimeAccum.current / sampleCount.current : 0,
          renderTime: (app?.renderer as any)?.plugins?.metrics?.renderTime || 0,
          drawCalls: (app?.renderer as any)?.plugins?.metrics?.drawCalls || 0,
          particleCount: getActiveParticleCount(),
          clusterCount: getClusterCount(),
          deviceTier,
        };
        setMetrics(stats);
        if (import.meta.env.DEV && Math.random() < 0.01) {
          if (stats.fps < 50 || stats.workerTime > PERF_BUDGETS.WORKER_MS) {
            console.warn('[field.atmo] Performance degradation:', stats);
          }
        }
        workerTimeAccum.current = 0; 
        sampleCount.current = 0;
      }
    };
  }, [app, deviceTier]);

  // Single ticker registration
  useEffect(() => {
    // bail if app not ready or ticker missing
    if (!app || !(app as any).ticker) return;

    const bound = () => onTickRef.current?.();
    app.ticker.add(bound);

    const handleWorkerPerf = (e: CustomEvent<{ duration: number }>) => {
      workerTimeAccum.current += e.detail.duration; 
      sampleCount.current++;
    };
    window.addEventListener('field-worker-perf', handleWorkerPerf as EventListener);

    return () => {
      window.removeEventListener('field-worker-perf', handleWorkerPerf as EventListener);
      // guard on cleanup too
      try { (app as any)?.ticker?.remove(bound); } catch {}
    };
  }, [app]);
  
  return { metrics, deviceTier };
}

// Quality adjustment helpers
export function shouldReduceQuality(metrics?: PerformanceMetrics): boolean {
  if (!metrics) return false;
  return metrics.fps < 30 || metrics.workerTime > PERF_BUDGETS.WORKER_MS * 1.5;
}

export function getQualitySettings(deviceTier: 'low' | 'mid' | 'high', degraded: boolean) {
  const base = {
    low: { 
      particles: PERF_BUDGETS.PARTICLES.LOW, 
      flowGrid: PERF_BUDGETS.FLOW_GRID_SIZE.LOW,
      maxArrows: Math.floor(P3.FLOW.MAX_ARROWS * 0.5),
      maxLanes: Math.floor(P3.LANES.MAX_LANES * 0.5),
      // Phase 3B atmospheric settings
      pressureGrid: Math.floor(P3B.PRESSURE.GRID_PX * 1.5),
      maxPressureCells: Math.floor(P3B.PRESSURE.MAX_CELLS * 0.5),
      maxStormGroups: Math.floor(P3B.STORMS.MAX_GROUPS * 0.5)
    },
    mid: { 
      particles: PERF_BUDGETS.PARTICLES.MID, 
      flowGrid: PERF_BUDGETS.FLOW_GRID_SIZE.MID,
      maxArrows: P3.FLOW.MAX_ARROWS,
      maxLanes: P3.LANES.MAX_LANES,
      pressureGrid: P3B.PRESSURE.GRID_PX,
      maxPressureCells: P3B.PRESSURE.MAX_CELLS,
      maxStormGroups: P3B.STORMS.MAX_GROUPS
    },
    high: { 
      particles: PERF_BUDGETS.PARTICLES.HIGH, 
      flowGrid: PERF_BUDGETS.FLOW_GRID_SIZE.HIGH,
      maxArrows: P3.FLOW.MAX_ARROWS,
      maxLanes: P3.LANES.MAX_LANES,
      pressureGrid: P3B.PRESSURE.GRID_PX,
      maxPressureCells: P3B.PRESSURE.MAX_CELLS,
      maxStormGroups: P3B.STORMS.MAX_GROUPS
    }
  }[deviceTier];
  
  if (degraded) {
    return {
      particles: Math.floor(base.particles * 0.6),
      flowGrid: base.flowGrid * 1.5, // Coarser grid
      maxArrows: Math.floor(base.maxArrows * 0.6),
      maxLanes: Math.floor(base.maxLanes * 0.6),
      pressureGrid: base.pressureGrid * 1.5, // Coarser pressure grid
      maxPressureCells: Math.floor(base.maxPressureCells * 0.6),
      maxStormGroups: Math.floor(base.maxStormGroups * 0.6),
      disableGlow: true,
      reducedLanes: true,
      reducedAtmosphere: true
    };
  }
  
  return { ...base, disableGlow: false, reducedLanes: false, reducedAtmosphere: false };
}

// Helper to emit worker performance events
export function emitWorkerPerfEvent(duration: number) {
  if (import.meta.env.DEV) {
    window.dispatchEvent(new CustomEvent('field-worker-perf', { 
      detail: { duration } 
    }));
  }
}