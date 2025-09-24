/**
 * Creates a debounced version of a function that delays invoking until after
 * the specified delay has elapsed since the last time it was invoked.
 * 
 * @param fn - The function to debounce
 * @param delay - The delay in milliseconds (default: 300)
 * @returns A debounced version of the function with a clear() method
 */
export function debounce<F extends (...args: any[]) => void>(fn: F, delay = 300): F & { clear(): void } {
  let timer: ReturnType<typeof setTimeout> | undefined;
  
  const debounced = ((...args: Parameters<F>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  }) as F & { clear(): void };
  
  debounced.clear = () => {
    if (timer) clearTimeout(timer);
    timer = undefined;
  };
  
  return debounced;
}

/**
 * Creates a throttled version of a function that only invokes at most once
 * per the specified delay. This is a leading-edge throttle (fires immediately,
 * then waits for the delay before allowing the next call).
 * 
 * @param fn - The function to throttle
 * @param delay - The delay in milliseconds (default: 300)
 * @param options - Configuration options
 * @returns A throttled version of the function with a clear() method
 */
export function throttle<F extends (...args: any[]) => void>(
  fn: F, 
  delay = 300, 
  options: { leading?: boolean; trailing?: boolean } = { leading: true, trailing: false }
): F & { clear(): void } {
  let lastCall = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  
  const throttled = ((...args: Parameters<F>) => {
    const now = Date.now();
    
    if (options.leading && now - lastCall >= delay) {
      lastCall = now;
      fn(...args);
    } else if (options.trailing) {
      // Trailing-edge throttle
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        lastCall = Date.now();
        fn(...args);
      }, delay);
    }
  }) as F & { clear(): void };
  
  throttled.clear = () => {
    if (timer) clearTimeout(timer);
    timer = undefined;
    lastCall = 0;
  };
  
  return throttled;
}