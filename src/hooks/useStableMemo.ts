import { useMemo, useRef } from 'react';

/**
 * Stable memoization hook that prevents array/object regeneration
 * Uses deep comparison for complex data structures
 */
export function useStableMemo<T>(
  factory: () => T,
  deps: React.DependencyList
): T {
  const depsRef = useRef<React.DependencyList>();
  const resultRef = useRef<T>();

  // Deep comparison for stability
  const depsChanged = !depsRef.current || 
    depsRef.current.length !== deps.length ||
    deps.some((dep, i) => {
      const prev = depsRef.current![i];
      return Array.isArray(dep) && Array.isArray(prev)
        ? JSON.stringify(dep) !== JSON.stringify(prev)
        : dep !== prev;
    });

  if (depsChanged) {
    depsRef.current = deps;
    resultRef.current = factory();
  }

  return resultRef.current!;
}

/**
 * Specialized hook for arrays that need stable references
 */
export function useStableArray<T>(
  array: T[],
  keyFn?: (item: T) => string | number
): T[] {
  return useStableMemo(() => {
    if (keyFn) {
      // Sort by key for deterministic order
      return [...array].sort((a, b) => {
        const keyA = keyFn(a);
        const keyB = keyFn(b);
        return keyA < keyB ? -1 : keyA > keyB ? 1 : 0;
      });
    }
    return [...array];
  }, [array.length, keyFn ? array.map(keyFn).join(',') : JSON.stringify(array)]);
}