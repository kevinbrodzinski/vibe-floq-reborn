// Real-time vibe engine hook
import { useState, useEffect, useCallback, useRef } from 'react';
import type { VibePoint, VibeEngineState } from '@/types/vibe';
import { SignalOrchestrator } from '@/lib/vibe/core/SignalOrchestrator';
import { LocationCollector } from '@/lib/vibe/collectors/LocationCollector';
import { MovementCollector } from '@/lib/vibe/collectors/MovementCollector';
import { TemporalCollector } from '@/lib/vibe/collectors/TemporalCollector';
import { DeviceCollector } from '@/lib/vibe/collectors/DeviceCollector';
import { BehavioralSequenceDetector } from '@/lib/vibe/collectors/BehavioralSequenceDetector';
import { useVibeDetection } from '@/store/useVibeDetection';

export function useVibeNow() {
  const [currentVibe, setCurrentVibe] = useState<VibePoint | null>(null);
  const [engineState, setEngineState] = useState<VibeEngineState | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const orchestratorRef = useRef<SignalOrchestrator | null>(null);
  const { autoMode } = useVibeDetection();

  // Initialize the vibe engine
  const initializeEngine = useCallback(() => {
    if (orchestratorRef.current || !autoMode) return;

    try {
      const orchestrator = new SignalOrchestrator();
      
      // Register signal collectors
      orchestrator.registerCollector(new LocationCollector());
      orchestrator.registerCollector(new MovementCollector());
      orchestrator.registerCollector(new TemporalCollector());
      orchestrator.registerCollector(new DeviceCollector());
      orchestrator.registerCollector(new BehavioralSequenceDetector());

      // Listen for state updates
      orchestrator.addListener((state) => {
        setEngineState(state);
        setCurrentVibe(state.currentVibe);
      });

      orchestratorRef.current = orchestrator;
      setIsInitialized(true);

      console.log('🧠 Vibe engine initialized with primary + behavioral signals');
    } catch (error) {
      console.error('Failed to initialize vibe engine:', error);
    }
  }, [autoMode]);

  // Cleanup engine
  const cleanupEngine = useCallback(() => {
    if (orchestratorRef.current) {
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
    if (autoMode) {
      initializeEngine();
    } else {
      cleanupEngine();
    }

    return cleanupEngine;
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
    
    // Utils for debugging
    getManualVibePoint,
    signalHealth: engineState?.signalHealth || {},
  };
}