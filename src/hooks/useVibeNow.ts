// Real-time vibe engine hook
import { useState, useEffect, useCallback, useRef } from 'react';
import type { VibePoint, VibeEngineState } from '@/types/vibe';
import { SignalOrchestrator } from '@/lib/vibe/core/SignalOrchestrator';
import { LocationCollector } from '@/lib/vibe/collectors/LocationCollector';
import { MovementCollector } from '@/lib/vibe/collectors/MovementCollector';
import { TemporalCollector } from '@/lib/vibe/collectors/TemporalCollector';
import { DeviceCollector } from '@/lib/vibe/collectors/DeviceCollector';
import { BehavioralSequenceDetector } from '@/lib/vibe/collectors/BehavioralSequenceDetector';
import { EnvironmentalCollector } from '@/lib/vibe/collectors/EnvironmentalCollector';
import { SocialCollector } from '@/lib/vibe/collectors/SocialCollector';
import { applyEnvironmental, applySocial } from '@/lib/vibe/core/EnhancedVibeCalculator';
import { socialCache } from '@/lib/social/socialCache';
import { useVibeDetection } from '@/store/useVibeDetection';

interface UseVibeNowOptions {
  requestEnvPermissions?: boolean;
}

export function useVibeNow(options: UseVibeNowOptions = {}) {
  const { requestEnvPermissions = false } = options;
  
  const [currentVibe, setCurrentVibe] = useState<VibePoint | null>(null);
  const [engineState, setEngineState] = useState<VibeEngineState | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const orchestratorRef = useRef<SignalOrchestrator | null>(null);
  const envRef = useRef<EnvironmentalCollector | null>(null);
  const socialRef = useRef<SocialCollector | null>(null);
  const { autoMode } = useVibeDetection();

  // Initialize the vibe engine
  const initializeEngine = useCallback(async () => {
    if (orchestratorRef.current || !autoMode) return;

    try {
      const orchestrator = new SignalOrchestrator();
      
      // Register primary signal collectors
      orchestrator.registerCollector(new LocationCollector());
      orchestrator.registerCollector(new MovementCollector());
      orchestrator.registerCollector(new TemporalCollector());
      orchestrator.registerCollector(new DeviceCollector());
      orchestrator.registerCollector(new BehavioralSequenceDetector());

      // Week-2: Environmental (permission-gated)
      const env = new EnvironmentalCollector();
      if (requestEnvPermissions) {
        await env.initPermissions(true, true); // audio + motion
      }
      if (env.isAvailable()) {
        orchestrator.registerCollector(env);
      }
      envRef.current = env;

      // Week-3: Social (provider backed by social cache)
      const provider = {
        getFriendHeads: socialCache.getFriendHeads,
        getMyRecentPath: socialCache.getMyPath,
        getConvergenceProb: socialCache.getConvergenceProb,
      };
      const social = new SocialCollector(provider);
      orchestrator.registerCollector(social);
      socialRef.current = social;

      // Listen for state updates with environmental + social blending
      const unsubscribe = orchestrator.addListener((state) => {
        const base = state.currentVibe as VibePoint;

        // Blend Environmental first
        const envSnap = (state.recentSnapshots?.[state.recentSnapshots.length - 1]?.sources?.environmental) ?? null;
        const envQuality = envRef.current ? envRef.current.getQuality() : 0;
        let blended = applyEnvironmental(base, envSnap, envQuality);

        // Then Social
        const socSnap = (state.recentSnapshots?.[state.recentSnapshots.length - 1]?.sources?.social) ?? null;
        const socQuality = socialRef.current ? socialRef.current.getQuality() : 0;
        blended = applySocial(blended, socSnap, socQuality);
        
        setEngineState(state);
        setCurrentVibe(blended);
      });
      
      // Store unsubscribe function for cleanup
      (orchestrator as any)._unsubscribe = unsubscribe;

      orchestratorRef.current = orchestrator;
      setIsInitialized(true);

      console.log('🧠 Vibe engine initialized with primary + environmental + social signals');
    } catch (error) {
      console.error('Failed to initialize vibe engine:', error);
    }
  }, [autoMode]);

  // Cleanup engine
  const cleanupEngine = useCallback(() => {
    try { 
      envRef.current?.dispose?.(); 
    } catch (error) {
      console.warn('Environmental collector cleanup failed:', error);
    }
    
    if (orchestratorRef.current) {
      // Call unsubscribe if available
      const unsubscribe = (orchestratorRef.current as any)._unsubscribe;
      if (unsubscribe) {
        try {
          unsubscribe();
        } catch (error) {
          console.warn('Vibe engine unsubscribe failed:', error);
        }
      }
      
      orchestratorRef.current.dispose();
      orchestratorRef.current = null;
      setIsInitialized(false);
      setCurrentVibe(null);
      setEngineState(null);
      
      console.log('🧠 Vibe engine cleaned up');
    }
  }, []);

  // Initialize/cleanup based on autoMode
  useEffect(() => {
    if (autoMode && !orchestratorRef.current) {
      initializeEngine();
    }
    return cleanupEngine; // guard remount/unmount
  }, [autoMode, initializeEngine, cleanupEngine]);

  // Manual vibe point generation for testing
  const getManualVibePoint = useCallback((): VibePoint => {
    const now = new Date();
    const hour = now.getHours();
    const isEvening = hour >= 18 && hour <= 23;
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;
    
    // Simple heuristic energy calculation
    let energy = 0.3; // baseline
    if (isEvening) energy += 0.3;
    if (isWeekend) energy += 0.2;
    
    return {
      t: now,
      energy: Math.min(1, energy + Math.random() * 0.2), // Add some variation
      confidence: 0.6,
      sources: ['temporal', 'manual'],
    };
  }, []);

  // Get current vibe (with fallback)
  const getCurrentVibe = useCallback((): VibePoint => {
    if (currentVibe) return currentVibe;
    return getManualVibePoint();
  }, [currentVibe, getManualVibePoint]);

  // Update venue (for behavioral sequence detection)
  const updateVenue = useCallback((venue: string, category: string, coordinates?: { lat: number; lng: number }) => {
    if (orchestratorRef.current) {
      const collectors = (orchestratorRef.current as any).collectors;
      const behavioralCollector = collectors.get('behavioral');
      if (behavioralCollector) {
        behavioralCollector.updateVenue(venue, category, coordinates);
      }
    }
  }, []);

  return {
    // Current state
    currentVibe: getCurrentVibe(),
    engineState,
    isInitialized,
    isEnabled: autoMode,
    
    // Actions
    updateVenue,
    requestEnv: async () => {
      let ok = false;
      if (!envRef.current) envRef.current = new EnvironmentalCollector();
      const res = await envRef.current.initPermissions(true, true);
      ok = !!(res.audio || res.motion);
      return ok;
    },
    enableEnvironmental: async () => {
      if (!envRef.current) envRef.current = new EnvironmentalCollector();
      const res = await envRef.current.initPermissions(true, true);
      return { micOk: !!res.audio, motionOk: !!res.motion };
    },
    
    // Utils for debugging
    getManualVibePoint,
    signalHealth: engineState?.signalHealth || {},
  };
}