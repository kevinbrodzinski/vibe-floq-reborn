import { useMemo } from 'react';

/**
 * Memoizes arrays with stable keys to prevent unnecessary re-renders
 * Uses JSON.stringify for key stability which is safe for simple objects
 */
export function useStableMemo<T>(
  factory: () => T[],
  deps: any[]
): T[] {
  return useMemo(factory, [
    // Create stable dependency by stringifying the array
    // This prevents re-renders when array contents are the same
    ...deps.map(dep => Array.isArray(dep) ? JSON.stringify(dep) : dep)
  ]);
}