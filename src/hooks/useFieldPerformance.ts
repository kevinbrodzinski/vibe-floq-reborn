import { useState, useEffect, useMemo } from 'react';
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
  
  useEffect(() => {
    // Bail if app not ready or ticker missing
    if (!app || !(app as any).ticker) return;
    
    let frames = 0;
    let workerTimeAccum = 0;
    let sampleCount = 0;
    
    const onTick = () => {
      frames++;
      
      // Sample every 60 frames (roughly 1 second at 60fps)
      if (frames % 60 === 0) {
        const stats: PerformanceMetrics = {
          fps: Math.round(app.ticker.FPS),
          workerTime: sampleCount > 0 ? workerTimeAccum / sampleCount : 0,
          renderTime: (app.renderer as any).plugins?.metrics?.renderTime || 0,
          drawCalls: (app.renderer as any).plugins?.metrics?.drawCalls || 0,
          particleCount: getActiveParticleCount(),
          clusterCount: getClusterCount(),
          deviceTier
        };
        
        setMetrics(stats);
        
        // Log if degraded (1% sample rate in dev)
        if (import.meta.env.DEV && Math.random() < 0.01) {
          if (stats.fps < 50 || stats.workerTime > PERF_BUDGETS.WORKER_MS) {
            console.warn('[field.atmo] Performance degradation:', stats);
          }
        }
        
        // Reset accumulators
        workerTimeAccum = 0;
        sampleCount = 0;
      }
    };
    
    app.ticker.add(onTick);
    
    // Listen for worker performance updates
    const handleWorkerPerf = (event: CustomEvent<{ duration: number }>) => {
      workerTimeAccum += event.detail.duration;
      sampleCount++;
    };
    
    window.addEventListener('field-worker-perf', handleWorkerPerf as EventListener);
    
    return () => {
      window.removeEventListener('field-worker-perf', handleWorkerPerf as EventListener);
      // Guard on cleanup too
      try { 
        (app as any)?.ticker?.remove(onTick); 
      } catch {
        // Ignore cleanup errors
      }
    };
  }, [app, deviceTier]);
  
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