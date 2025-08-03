// Retry utility for edge functions
export async function withRetry<T>(
  fn: () => Promise<T>,
  { attempts = 3, backoffMs = 1000 } = {}
): Promise<T> {
  let lastErr;
  for (let i = 1; i <= attempts; i++) {
    try { 
      return await fn(); 
    } catch (e) {
      lastErr = e;
      if (i === attempts) throw e;
      await new Promise(r => setTimeout(r, backoffMs * 2 ** (i - 1)));
    }
  }
  throw lastErr;
}

// Sleep utility for manual delays
export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));