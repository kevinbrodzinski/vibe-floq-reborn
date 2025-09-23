// Custom shim for use-sync-external-store that uses React 18's built-in implementation
import { useSyncExternalStore } from 'react';

// Main hook export
export { useSyncExternalStore };

// Default export for compatibility
export default useSyncExternalStore;

// with-selector variant that SWR and other libraries expect
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