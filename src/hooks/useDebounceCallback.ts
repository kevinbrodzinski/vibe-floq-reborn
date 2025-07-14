import { useCallback, useRef } from 'react';

/**
 * Debounce function calls with leading edge support
 */
export function useDebounceCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  leading = false
): T {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const leadingRef = useRef(true);

  return useCallback(
    ((...args: Parameters<T>) => {
      const callNow = leading && leadingRef.current;
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        leadingRef.current = true;
        if (!leading) {
          callback(...args);
        }
      }, delay);

      if (callNow) {
        leadingRef.current = false;
        callback(...args);
      }
    }) as T,
    [callback, delay, leading]
  );
}