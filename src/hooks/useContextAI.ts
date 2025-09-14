import { useEffect, useState, useRef } from 'react';
import { ContextEngine } from '@/core/context/ContextEngine';
import type { ContextValue, ApplicationContext } from '@/core/context/ContextEngine';
import type { ContextSummary } from '@/core/context/types';
import { usePersonalityInsights } from './usePersonalityInsights';
import { useVibeEngine } from './useVibeEngine';

export function useContextAI() {
  const engineRef = useRef<ContextEngine>();
  const [contextValue, setContextValue] = useState<ContextValue | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const insights = usePersonalityInsights();
  const vibeEngine = useVibeEngine();

  useEffect(() => {
    const initializeContext = async () => {
      try {
        if (!engineRef.current) {
          engineRef.current = new ContextEngine();
        }
        
        const appContext: ApplicationContext = {
          vibeEngine: (window as any).vibeEngine || vibeEngine,
          insights,
          patterns: insights?.hasEnoughData ? insights : null,
          location: null
        };
        
        await engineRef.current.initialize(appContext);
        setIsInitialized(true);
      } catch (error) {
        console.warn('Failed to initialize context AI:', error);
        setIsInitialized(true);
      }
    };

    initializeContext();
  }, [vibeEngine, insights]);

  useEffect(() => {
    if (!isInitialized || !engineRef.current) return;

    const updateContext = async () => {
      try {
        const appContext: ApplicationContext = {
          vibeEngine: (window as any).vibeEngine || vibeEngine,
          insights,
          patterns: insights?.hasEnoughData ? insights : null,
          location: null
        };
        
        engineRef.current!.updateContext(appContext);
        const value = await engineRef.current!.maintain({
          type: 'context_update',
          timestamp: Date.now()
        });
        
        setContextValue(value);
      } catch (error) {
        console.warn('Failed to update context:', error);
      }
    };

    updateContext();
    const interval = setInterval(updateContext, 60000);
    return () => clearInterval(interval);
  }, [isInitialized, vibeEngine, insights]);

  return {
    context: contextValue?.synthesis ? {
      vibeTransitions: [],
      venueSequence: [],
      correctionTrends: [],
      contextualInsights: [],
      factCount: contextValue.synthesis.metadata.factCount,
      confidence: contextValue.synthesis.metadata.confidence,
      summary: 'Context AI is active and learning'
    } as ContextSummary : null,
    contextValue,
    isInitialized,
    recordFact: async (fact: any) => {
      if (!engineRef.current) return '';
      return engineRef.current.recordFact(fact);
    }
  };
}