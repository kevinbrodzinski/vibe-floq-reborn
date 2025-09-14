import { useEffect, useState, useRef, useCallback } from 'react';
import { ContextTruthLedger } from '@/core/context/ContextTruthLedger';
import { WorkingSetManager } from '@/core/context/WorkingSetManager';
import { synthesizeContextSummary } from '@/core/context/ContextSynthesizer';
import { detectFriction } from '@/core/context/FrictionDetector';
import type { 
  ContextFact, 
  ContextSummary, 
  ContextSnapshot,
  VibeFact,
  TransitionFact,
  TemporalFact
} from '@/core/context/types';
import { usePersonalityInsights } from './usePersonalityInsights';
import { useVibeEngine } from './useVibeEngine';

export interface ContextAIState {
  context: ContextSummary | null;
  snapshot: ContextSnapshot | null;
  friction: ReturnType<typeof detectFriction> | null;
  isInitialized: boolean;
  factCount: number;
}

export function useContextAI(): ContextAIState & {
  recordFact: (fact: ContextFact) => Promise<string>;
  recordVibeReading: (vibe: string, confidence: number, components: Record<string, number>) => Promise<void>;
  recordTransition: (from: string, to: string, latencyMs?: number) => Promise<void>;
  workingSet: WorkingSetManager;
} {
  const ledgerRef = useRef<ContextTruthLedger>();
  const workingSetRef = useRef<WorkingSetManager>();
  const [state, setState] = useState<ContextAIState>({
    context: null,
    snapshot: null,
    friction: null,
    isInitialized: false,
    factCount: 0
  });
  
  const insights = usePersonalityInsights();
  const vibeEngine = useVibeEngine();

  // Initialize ledger and working set
  useEffect(() => {
    if (!ledgerRef.current) {
      ledgerRef.current = new ContextTruthLedger();
      workingSetRef.current = new WorkingSetManager(ledgerRef.current);
      
      // Record session start
      const now = Date.now();
      const hour = new Date().getHours();
      const dayOfWeek = new Date().getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      const temporalFact: TemporalFact = {
        kind: 'temporal',
        t: now,
        c: 0.9,
        data: { hour, dayOfWeek, isWeekend }
      };
      
      ledgerRef.current.append(temporalFact).then(() => {
        setState(prev => ({ ...prev, isInitialized: true }));
      });
    }
  }, []);

  // Record vibe readings automatically
  useEffect(() => {
    if (!ledgerRef.current || !vibeEngine.productionReading) return;
    
    const reading = vibeEngine.productionReading;
    if (reading.vibe && reading.confidence01 > 0.1) {
      const vibeFact: VibeFact = {
        kind: 'vibe',
        t: Date.now(),
        c: reading.confidence01,
        data: {
          vibe: reading.vibe,
          confidence: reading.confidence01,
          components: reading.components || {}
        }
      };
      
      ledgerRef.current.append(vibeFact);
    }
  }, [vibeEngine.productionReading?.vibe, vibeEngine.productionReading?.confidence01]);

  // Update context synthesis periodically
  useEffect(() => {
    if (!state.isInitialized || !ledgerRef.current) return;

    const updateContext = () => {
      const facts = ledgerRef.current!.getFacts({ limit: 500 });
      const context = synthesizeContextSummary(facts);
      const friction = detectFriction(facts);
      
      setState(prev => ({
        ...prev,
        context,
        friction,
        factCount: facts.length
      }));
    };

    updateContext();
    const interval = setInterval(updateContext, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [state.isInitialized]);

  const recordFact = useCallback(async (fact: ContextFact): Promise<string> => {
    if (!ledgerRef.current) throw new Error('Ledger not initialized');
    
    const factWithId = await ledgerRef.current.append(fact);
    
    // Trigger immediate context update for important facts
    if (['vibe', 'transition'].includes(fact.kind)) {
      setTimeout(() => {
        const facts = ledgerRef.current!.getFacts({ limit: 500 });
        const context = synthesizeContextSummary(facts);
        setState(prev => ({ ...prev, context, factCount: facts.length }));
      }, 100);
    }
    
    return factWithId.id;
  }, []);

  const recordVibeReading = useCallback(async (vibe: string, confidence: number, components: Record<string, number>) => {
    const vibeFact: VibeFact = {
      kind: 'vibe',
      t: Date.now(),
      c: confidence,
      data: { vibe: vibe as any, confidence, components }
    };
    
    await recordFact(vibeFact);
  }, [recordFact]);

  const recordTransition = useCallback(async (from: string, to: string, latencyMs?: number) => {
    // Record in working set (which also records transition fact)
    if (workingSetRef.current) {
      await workingSetRef.current.pushView({ route: to }, { from, latencyMs });
    } else {
      // Fallback: record transition fact directly if working set not ready
      const transitionFact: TransitionFact = {
        kind: 'transition',
        t: Date.now(),
        c: 0.8,
        data: { from, to, latencyMs }
      };
      await recordFact(transitionFact);
    }
  }, [recordFact]);

  return {
    ...state,
    recordFact,
    recordVibeReading,
    recordTransition,
    workingSet: workingSetRef.current ?? null
  };
}