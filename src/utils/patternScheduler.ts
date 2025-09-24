/**
 * Scheduler for heavy pattern computation to avoid blocking main thread
 */

export function schedulePatternWork(fn: () => void, options?: { timeout?: number }) {
  const timeout = options?.timeout || 1000;
  
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    (window as any).requestIdleCallback(fn, { timeout });
  } else {
    setTimeout(fn, 0);
  }
}

export function scheduleBatch<T>(
  items: T[],
  processor: (item: T) => void | Promise<void>,
  batchSize: number = 5
): Promise<void> {
  return new Promise((resolve) => {
    let index = 0;
    
    const processBatch = async () => {
      const batch = items.slice(index, index + batchSize);
      
      if (batch.length === 0) {
        resolve();
        return;
      }
      
      // Process batch
      await Promise.all(batch.map(processor));
      
      index += batchSize;
      
      // Schedule next batch
      schedulePatternWork(processBatch);
    };
    
    schedulePatternWork(processBatch);
  });
}