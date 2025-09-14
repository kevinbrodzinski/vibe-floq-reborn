import { useState, useEffect, useCallback } from 'react';
import { vibeToHex } from '@/lib/vibe';
import { safeVibe, type Vibe } from '@/lib/vibes';
import { evaluate } from '@/core/vibe/VibeEngine';
import { useSignalCollector } from '@/core/vibe/SignalCollector';
import type { VibeReading } from '@/core/vibe/types';
import { setUserVibeHex } from '@/lib/vibe/vibeColor';
import { saveSnapshot } from '@/storage/vibeSnapshots';

interface VibeEngineState {
  currentVibe: Vibe;
  confidence: number;
  lastUpdate: Date;
  isDetecting: boolean;
  components: {
    temporal: number;
    movement: number;
    environmental: number;
    behavioral: number;
  };
}

interface VibeSnapshot {
  timestamp: Date;
  vibe: Vibe;
  confidence: number;
  components: VibeEngineState['components'];
}

const FLAG = (import.meta as any).env?.VITE_VIBE_DETECTION ?? "on";

/**
 * Vibe Engine MVP Hook
 * Computes real-time vibe from multiple signal sources
 * Ready to drive unified color system and gradients
 */
export function useVibeEngine(enabled: boolean = true) {
  const [inputsCache, setInputsCache] = useState<any>(null);

  const [state, setState] = useState<VibeEngineState>({
    currentVibe: 'chill',
    confidence: 0.8,
    lastUpdate: new Date(),
    isDetecting: false,
    components: {
      temporal: 0.7,
      movement: 0.3,
      environmental: 0.6,
      behavioral: 0.8,
    }
  });

  const [snapshots, setSnapshots] = useState<VibeSnapshot[]>([]);
  const [productionReading, setProductionReading] = useState<VibeReading | null>(null);
  const { collect } = useSignalCollector();

  // Temporal component (time of day, day of week)
  const computeTemporalVibe = useCallback((): number => {
    const hour = new Date().getHours();
    if (hour < 6) return 0.2; // quiet/chill hours
    if (hour < 9) return 0.5; // morning energy
    if (hour < 17) return 0.7; // active day
    if (hour < 22) return 0.8; // peak social
    return 0.4; // winding down
  }, []);

  // Movement component (placeholder for device motion)
  const computeMovementVibe = useCallback((): number => {
    // TODO: Integrate with device motion sensors
    // For now, simulate movement detection
    return 0.3 + Math.random() * 0.4;
  }, []);

  // Environmental component (location, weather, etc.)
  const computeEnvironmentalVibe = useCallback((): number => {
    // TODO: Integrate with location/venue data
    return 0.5 + Math.random() * 0.3;
  }, []);

  // Behavioral component (app usage patterns)
  const computeBehavioralVibe = useCallback((): number => {
    // TODO: Integrate with user interaction patterns
    return 0.6 + Math.random() * 0.3;
  }, []);

  // Combine components into vibe prediction
  const computeVibe = useCallback((): { vibe: Vibe; confidence: number; components: VibeEngineState['components'] } => {
    const components = {
      temporal: computeTemporalVibe(),
      movement: computeMovementVibe(),
      environmental: computeEnvironmentalVibe(),
      behavioral: computeBehavioralVibe(),
    };

    // Weighted combination (adjust weights based on data quality)
    const weights = { temporal: 0.3, movement: 0.2, environmental: 0.3, behavioral: 0.2 };
    const combined = Object.entries(components).reduce(
      (sum, [key, value]) => sum + value * weights[key as keyof typeof weights], 
      0
    );

    // Map combined score to vibe enum
    const vibeIndex = Math.floor(combined * 10) % 10;
    const vibes: Vibe[] = ['chill', 'flowing', 'social', 'open', 'curious', 'energetic', 'hype', 'weird', 'romantic', 'down'];
    const vibe = vibes[vibeIndex] || 'chill';

    // Confidence based on component consistency
    const variance = Object.values(components).reduce((acc, val) => acc + Math.pow(val - combined, 2), 0) / 4;
    const confidence = Math.max(0.3, 1 - variance);

    return { vibe: safeVibe(vibe), confidence, components };
  }, [computeTemporalVibe, computeMovementVibe, computeEnvironmentalVibe, computeBehavioralVibe]);

  // Snapshot recording for debug/learning
  const recordSnapshot = useCallback((vibe: Vibe, confidence: number, components: VibeEngineState['components']) => {
    const snapshot: VibeSnapshot = {
      timestamp: new Date(),
      vibe,
      confidence,
      components,
    };

    setSnapshots(prev => {
      const updated = [...prev, snapshot];
      // Keep last 100 snapshots
      return updated.slice(-100);
    });

    // TODO: Store in SQLite for persistence
    // await db.vibe_snapshots.insert(snapshot);
  }, []);

  // Production engine tick
  const productionTick = useCallback(() => {
    if (FLAG === "on") {
      const inputs = collect();
      const reading = evaluate(inputs);
      setProductionReading(reading);
      
      // Confidence → UI intensity
      const vibeHex = vibeToHex(safeVibe(reading.vibe));
      const vibeAlpha = 0.5 + 0.5 * reading.confidence01;              // 0.5..1.0
      const vibeSat = 0.6 + 0.4 * Math.max(0, Math.min(1, reading.confidence01)); // 0.6..1.0
      
      document.documentElement.style.setProperty('--vibe-alpha', String(vibeAlpha));
      document.documentElement.style.setProperty('--vibe-hex', vibeHex);
      document.documentElement.style.setProperty('--vibe-sat', String(vibeSat));
      setUserVibeHex(vibeHex);
      
      // Performance logging (dev-only)
      if (import.meta.env.DEV && reading.calcMs > 80) {
        console.warn('[vibe] slow step', reading.calcMs);
      }
      
      saveSnapshot(reading);
      
      // Update legacy state for compatibility
      setState(prev => ({
        ...prev,
        currentVibe: reading.vibe,
        confidence: reading.confidence01,
        lastUpdate: new Date(),
        components: {
          temporal: reading.components.circadian || 0,
          movement: reading.components.movement || 0,
          environmental: reading.components.venueEnergy || 0,
          behavioral: reading.components.deviceUsage || 0,
        }
      }));
    }
  }, [collect]);

  // Production engine with adaptive polling
  useEffect(() => {
    if (FLAG !== 'on') return;
    
    let tm: number | null = null;
    let raf: number | null = null;
    let alive = true;

    // compute next interval from inputs and visibility
    function nextIntervalMs(inp: any, hidden: boolean) {
      if (hidden) return 5 * 60_000;          // hidden → chill
      const s = inp.speedMps ?? 0;
      if (s <= 0.1) return 5 * 60_000;        // stationary
      if (s <= 1.5) return 2 * 60_000;        // walking
      return Math.max(20_000, 60_000);         // moving faster, but min 20s
    }

    const schedule = (ms: number) => {
      if (tm) clearTimeout(tm);
      tm = window.setTimeout(() => {
        raf = requestAnimationFrame(step);
      }, ms);
    };

    const step = () => {
      if (!alive) return;
      const inputs = collect();
      setInputsCache(inputs);
      const r = evaluate(inputs);
      setProductionReading(r);

      // CSS vars for confidence tint
      const vibeHex = vibeToHex(safeVibe(r.vibe));
      const vibeAlpha = 0.5 + 0.5 * r.confidence01;
      const vibeSat = Math.max(0.3, r.confidence01);
      
      document.documentElement.style.setProperty('--vibe-hex', vibeHex);
      document.documentElement.style.setProperty('--vibe-alpha', String(vibeAlpha));
      document.documentElement.style.setProperty('--vibe-sat', String(vibeSat));

      saveSnapshot(r);

      const hidden = typeof document !== 'undefined' ? document.hidden : false;
      const ms = nextIntervalMs(inputs, hidden);
      schedule(ms);
    };

    // prime immediately
    requestAnimationFrame(step);

    // pause/resume on visibility
    const onVis = () => { 
      if (!document.hidden && tm == null) 
        schedule(250); 
    };
    document.addEventListener('visibilitychange', onVis, { passive: true });

    return () => { 
      alive = false; 
      if (tm) clearTimeout(tm);
      if (raf) cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVis); 
    };
  }, [collect]);

  // Legacy detection loop for dev mode
  useEffect(() => {
    if (FLAG === 'on' || !enabled) return;

    setState(prev => ({ ...prev, isDetecting: true }));

    const interval = window.setInterval(() => {
      const { vibe, confidence, components } = computeVibe();
      
      setState(prev => ({
        ...prev,
        currentVibe: vibe,
        confidence,
        lastUpdate: new Date(),
        components,
      }));

      recordSnapshot(vibe, confidence, components);
    }, 60000);

    // Initial computation
    const initial = computeVibe();
    setState(prev => ({
      ...prev,
      currentVibe: initial.vibe,
      confidence: initial.confidence,
      components: initial.components,
    }));

    return () => clearInterval(interval);
  }, [enabled, computeVibe, recordSnapshot]);

  // User feedback for learning
  const recordCorrection = useCallback(async (actualVibe: Vibe, reason?: string) => {
    const reading = productionReading;
    if (!reading) return;

    try {
      // Use unified delta learning approach
      const { learnFromCorrection } = await import('@/core/vibe/learning/PersonalWeightStore');
      learnFromCorrection({
        predicted: reading.vibe,
        target: actualVibe,
        componentScores: reading.components,
        eta: 0.02,
      });

      console.log(`🎯 Learning: ${reading.vibe} → ${actualVibe}`, { 
        reason, 
        confidence: reading.confidence01 
      });
    } catch (error) {
      console.warn('[Learning] Failed to record correction:', error);
    }
    
    // Immediately update to user's vibe
    setState(prev => ({
      ...prev,
      currentVibe: actualVibe,
      confidence: 0.9, // High confidence in user input
      lastUpdate: new Date(),
    }));
  }, [productionReading]);

  return {
    // Current state
    currentVibe: state.currentVibe,
    confidence: state.confidence,
    isDetecting: state.isDetecting,
    lastUpdate: state.lastUpdate,
    components: state.components,

    // For UI integration
    currentVibeHex: vibeToHex(state.currentVibe),
    
    // Debug/learning data
    snapshots,
    productionReading, // Full production engine reading when available
    
    // Actions
    recordCorrection,
    
    // Manual control
    setVibeOverride: (vibe: Vibe) => setState(prev => ({ 
      ...prev, 
      currentVibe: safeVibe(vibe),
      confidence: 1.0,
      lastUpdate: new Date()
    })),
    
    // Production engine status
    isProductionMode: FLAG === "on",
  };
}
