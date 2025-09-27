/**
 * Throttle temporal events to prevent PIXI performance spikes
 * Gates inbound emit calls to ~30fps to keep PIXI at steady cadence
 */

let lastEmit = 0;
const THROTTLE_MS = 33; // ~30fps

export function throttleTemporalEmit<T>(
  emitFn: (evt: T) => void,
  evt: T
): void {
  const now = performance.now();
  if (now - lastEmit < THROTTLE_MS) return;
  
  lastEmit = now;
  emitFn(evt);
}

/**
 * Create a throttled version of an emit function
 */
export function createThrottledEmit<T>(
  emitFn: (evt: T) => void,
  intervalMs = THROTTLE_MS
): (evt: T) => void {
  let last = 0;
  
  return (evt: T) => {
    const now = performance.now();
    if (now - last < intervalMs) return;
    last = now;
    emitFn(evt);
  };
}