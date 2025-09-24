import { WorkingSetManager } from './WorkingSetManager';
import { ContextTruthLedger } from './ContextTruthLedger';

// Singleton instances for route tracking
let workingSetManager: WorkingSetManager | null = null;

function getWorkingSetManager(): WorkingSetManager {
  if (!workingSetManager) {
    const ledger = new ContextTruthLedger();
    workingSetManager = new WorkingSetManager(ledger);
  }
  return workingSetManager;
}

/** Call this when a navigation happens */
export async function recordRouteChange(
  from: string, 
  to: string, 
  latencyMs?: number, 
  params?: Record<string, unknown>
) {
  try {
    const ws = getWorkingSetManager();
    await ws.pushView({ route: to, params }, { from, latencyMs });
  } catch (error) {
    console.warn('Failed to record route change:', error);
  }
}

/** Optional helpers */
export function getWorkingSet() {
  return getWorkingSetManager();
}

/** Record scroll or view updates */
export function recordViewUpdate(patch: { scrollY?: number; selectionId?: string; params?: Record<string, unknown> }) {
  try {
    const ws = getWorkingSetManager();
    ws.updateView(patch);
  } catch (error) {
    console.warn('Failed to record view update:', error);
  }
}

/** Record a draft being saved */
export function recordDraft(id: string, type: string, payload: unknown) {
  try {
    const ws = getWorkingSetManager();
    ws.saveDraft({
      id,
      type,
      payload,
      updatedAt: Date.now()
    });
  } catch (error) {
    console.warn('Failed to record draft:', error);
  }
}

/** Record focus changes */
export function recordFocus(id: string, kind: 'item' | 'field' | 'pane', label?: string) {
  try {
    const ws = getWorkingSetManager();
    ws.setFocus({ id, kind, label, t: Date.now() });
  } catch (error) {
    console.warn('Failed to record focus:', error);
  }
}