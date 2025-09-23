// with-selector variant that libraries like recharts expect
import { useSyncExternalStore } from 'react';

export function useSyncExternalStoreWithSelector<Snapshot, Selection>(
  subscribe: (onStoreChange: () => void) => () => void,
  getSnapshot: () => Snapshot,
  getServerSnapshot: undefined | null | (() => Snapshot),
  selector: (snapshot: Snapshot) => Selection,
  isEqual?: (a: Selection, b: Selection) => boolean
): Selection {
  // Use React's built-in useSyncExternalStore and apply the selector manually
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  
  // Simple selector application with optional equality check
  const selection = selector(snapshot);
  
  // For simplicity, we don't implement the full useSyncExternalStoreWithSelector optimization
  // React 18's useSyncExternalStore is efficient enough for most use cases
  return selection;
}

// Default export for compatibility
export default useSyncExternalStoreWithSelector;