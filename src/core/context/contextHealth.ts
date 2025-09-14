import { ContextTruthLedger } from './ContextTruthLedger';
import { WorkingSetManager } from './WorkingSetManager';

/**
 * Development-only health probes for the Context system
 */
export interface ContextHealth {
  ledger: {
    count: number;
    verify: () => Promise<boolean>;
    recentFacts: number;
  };
  workingSet: {
    viewCount: number;
    draftCount: number;
    currentRoute: string | undefined;
  };
}

/**
 * Get health status of context system (dev-only)
 */
export function getContextHealth(
  ledger: ContextTruthLedger, 
  workingSet: WorkingSetManager
): ContextHealth {
  const recentFacts = ledger.getRecentFacts(10 * 60 * 1000).length; // Last 10 minutes
  const snapshot = workingSet.snapshot();
  
  return {
    ledger: {
      count: ledger.getCount(),
      verify: () => ledger.verify(),
      recentFacts
    },
    workingSet: {
      viewCount: snapshot.viewStack.length,
      draftCount: Object.keys(snapshot.drafts).length,
      currentRoute: workingSet.currentView()?.route
    }
  };
}

/**
 * Performance timing for context operations
 */
export async function benchmarkContext(
  ledger: ContextTruthLedger,
  factCount = 100
): Promise<{ synthesisMs: number; verifyMs: number }> {
  const facts = ledger.getFacts({ limit: factCount });
  
  const start1 = performance.now();
  const { synthesizeContextSummary } = await import('./ContextSynthesizer');
  synthesizeContextSummary(facts);
  const synthesisMs = performance.now() - start1;
  
  const start2 = performance.now();
  await ledger.verify();
  const verifyMs = performance.now() - start2;
  
  return { synthesisMs, verifyMs };
}