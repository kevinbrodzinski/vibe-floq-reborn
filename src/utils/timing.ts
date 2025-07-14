/**
 * Creates a debounced version of a function that delays invoking until after
 * the specified delay has elapsed since the last time it was invoked.
 * 
 * @param fn - The function to debounce
 * @param delay - The delay in milliseconds (default: 300)
 * @returns A debounced version of the function
 */
export function debounce<F extends (...args: any[]) => void>(fn: F, delay = 300): F {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return ((...args: Parameters<F>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  }) as F;
}

/**
 * Creates a throttled version of a function that only invokes at most once
 * per the specified delay.
 * 
 * @param fn - The function to throttle
 * @param delay - The delay in milliseconds (default: 300)
 * @returns A throttled version of the function
 */
export function throttle<F extends (...args: any[]) => void>(fn: F, delay = 300): F {
  let lastCall = 0;
  return ((...args: Parameters<F>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      fn(...args);
    }
  }) as F;
}