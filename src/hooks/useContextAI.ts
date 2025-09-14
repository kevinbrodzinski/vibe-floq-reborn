import { useState, useEffect, useRef, useCallback } from 'react';
import { ContextFactStore } from '@/core/context/ContextFactStore';
import { ContextSynthesizer } from '@/core/context/ContextSynthesizer';
import { WorkingSetExtractor } from '@/core/context/WorkingSetExtractor';
import type { 
  ContextFact, 
  ContextSummary, 
  WorkingSet,
  ContextFactWithId 
} from '@/core/context/types';
import type { VibeReading } from '@/core/vibe/types';
import type { PersonalityInsights } from '@/types/personality';

/**
 * Context AI Hook - provides context awareness and fact recording
 * Integrates with existing vibe engine and intelligence system
 */
export function useContextAI() {
  const factStore = useRef(new ContextFactStore());
  const synthesizer = useRef(new ContextSynthesizer());
  const workingSetExtractor = useRef(new WorkingSetExtractor());
  
  const [context, setContext] = useState<ContextSummary | null>(null);
  const [workingSet, setWorkingSet] = useState<WorkingSet | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  /**
   * Record a context fact
   */
  const recordFact = useCallback(async (fact: ContextFact): Promise<string | null> => {
    try {
      const factId = await factStore.current.append(fact);
      
      // Trigger context re-synthesis on important facts
      if (['vibe_correction', 'venue_transition', 'energy_transition'].includes(fact.type)) {
        // Debounced synthesis will pick this up
        setTimeout(() => synthesizeContext(), 1000);
      }
      
      return factId;
    } catch (error) {
      console.warn('Failed to record context fact:', error);
      return null;
    }
  }, []);
  
  /**
   * Extract and save current working set
   */
  const updateWorkingSet = useCallback(async (
    vibeReading: VibeReading, 
    insights: PersonalityInsights
  ): Promise<void> => {
    try {
      const newWorkingSet = workingSetExtractor.current.extract(vibeReading, insights);
      setWorkingSet(newWorkingSet);
      await workingSetExtractor.current.save(newWorkingSet);
    } catch (error) {
      console.warn('Failed to update working set:', error);
    }
  }, []);
  
  /**
   * Synthesize context from facts
   */
  const synthesizeContext = useCallback(async (): Promise<void> => {
    try {
      const facts = await factStore.current.getRecent(100);
      const contextSummary = synthesizer.current.synthesize(facts);
      setContext(contextSummary);
    } catch (error) {
      console.warn('Failed to synthesize context:', error);
    }
  }, []);
  
  /**
   * Initialize context AI system
   */
  const initialize = useCallback(async (): Promise<void> => {
    try {
      // Start new session
      workingSetExtractor.current.startNewSession();
      
      // Check for resumable session
      const restoredWorkingSet = await workingSetExtractor.current.restore();
      if (restoredWorkingSet) {
        setWorkingSet(restoredWorkingSet);
        
        // Record session resume
        await recordFact({
          type: 'session_context',
          data: {
            entry: 'resume',
            lastVibe: restoredWorkingSet.currentVibe,
            timeGap: Date.now() - restoredWorkingSet.timestamp
          }
        });
      } else {
        // Record cold start
        await recordFact({
          type: 'session_context',
          data: {
            entry: 'cold_start',
            lastVibe: 'chill', // Default
            timeGap: 0
          }
        });
      }
      
      // Initial context synthesis
      await synthesizeContext();
      
      // Cleanup old facts
      await factStore.current.cleanup();
      
      setIsInitialized(true);
    } catch (error) {
      console.warn('Failed to initialize context AI:', error);
      setIsInitialized(true); // Continue even if initialization fails
    }
  }, [recordFact, synthesizeContext]);
  
  /**
   * Get context stats
   */
  const getStats = useCallback(async () => {
    try {
      const totalFacts = await factStore.current.getCount();
      const recentFacts = await factStore.current.getInTimeWindow(60 * 60 * 1000); // 1 hour
      
      return {
        totalFacts,
        recentFactCount: recentFacts.length,
        sessionDuration: workingSetExtractor.current.getSessionDuration(),
        hasValidSession: await workingSetExtractor.current.hasValidSession()
      };
    } catch (error) {
      console.warn('Failed to get context stats:', error);
      return {
        totalFacts: 0,
        recentFactCount: 0,
        sessionDuration: 0,
        hasValidSession: false
      };
    }
  }, []);
  
  // Initialize on mount
  useEffect(() => {
    initialize();
  }, [initialize]);
  
  // Periodic context synthesis
  useEffect(() => {
    if (!isInitialized) return;
    
    const interval = setInterval(synthesizeContext, 60000); // Every minute
    return () => clearInterval(interval);
  }, [isInitialized, synthesizeContext]);
  
  // Listen for fact addition events
  useEffect(() => {
    const handleFactAdded = () => {
      // Debounced synthesis
      setTimeout(synthesizeContext, 2000);
    };
    
    window.addEventListener('context:fact:added', handleFactAdded);
    return () => window.removeEventListener('context:fact:added', handleFactAdded);
  }, [synthesizeContext]);
  
  return {
    // State
    context,
    workingSet,
    isInitialized,
    
    // Actions
    recordFact,
    updateWorkingSet,
    synthesizeContext,
    getStats,
    
    // Utilities
    factStore: factStore.current,
    workingSetExtractor: workingSetExtractor.current
  };
}