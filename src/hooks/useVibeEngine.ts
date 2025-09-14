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
      setUserVibeHex(vibeToHex(safeVibe(reading.vibe)));
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

  // Main detection loop
  useEffect(() => {
    if (!enabled) {
      setState(prev => ({ ...prev, isDetecting: false }));
      return;
    }

    setState(prev => ({ ...prev, isDetecting: true }));

    let interval: number;
    let raf = 0;

    if (FLAG === "on") {
      // Production engine: immediate tick + 60s interval
      raf = requestAnimationFrame(productionTick);
      interval = window.setInterval(() => { 
        raf = requestAnimationFrame(productionTick); 
      }, 60000);
    } else {
      // Legacy engine: compute + interval
      interval = window.setInterval(() => {
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
    }

    return () => { 
      clearInterval(interval); 
      cancelAnimationFrame(raf); 
    };
  }, [enabled, computeVibe, recordSnapshot, productionTick]);

  // User feedback for learning
  const recordCorrection = useCallback((actualVibe: Vibe, reason?: string) => {
    // TODO: Implement learning system
    console.log(`🎯 User correction: ${state.currentVibe} → ${actualVibe}`, { reason, confidence: state.confidence });
    
    // Immediately update to user's vibe
    setState(prev => ({
      ...prev,
      currentVibe: actualVibe,
      confidence: 0.9, // High confidence in user input
      lastUpdate: new Date(),
    }));
  }, [state.currentVibe, state.confidence]);

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
