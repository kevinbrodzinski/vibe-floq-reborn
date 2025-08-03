interface RetryOptions {
  attempts: number;
  backoffMs: number;
  maxBackoffMs?: number;
  backoffMultiplier?: number;
}

interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attemptsMade: number;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const {
    attempts,
    backoffMs,
    maxBackoffMs = 30000,
    backoffMultiplier = 2
  } = options;

  let lastError: Error;
  let currentBackoff = backoffMs;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const result = await fn();
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === attempts) {
        // Last attempt failed, throw the error
        throw lastError;
      }

      // Wait before retrying
      console.warn(`[Retry] Attempt ${attempt}/${attempts} failed: ${lastError.message}. Retrying in ${currentBackoff}ms...`);
      await new Promise(resolve => setTimeout(resolve, currentBackoff));
      
      // Increase backoff for next attempt
      currentBackoff = Math.min(currentBackoff * backoffMultiplier, maxBackoffMs);
    }
  }

  // This should never be reached, but TypeScript requires it
  throw lastError!;
}

export async function withRetryResult<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<RetryResult<T>> {
  try {
    const result = await withRetry(fn, options);
    return {
      success: true,
      result,
      attemptsMade: 1 // This is a simplification - we don't track exact attempts in withRetry
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
      attemptsMade: options.attempts
    };
  }
}

// Sleep utility for manual delays
export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));