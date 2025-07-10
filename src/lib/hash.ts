/**
 * Hash utility functions for consistent hashing across the application
 */

/**
 * djb2 hash algorithm - simple, fast, and effective
 * Returns a 32-bit unsigned integer hash
 */
export function djb2(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) + str.charCodeAt(i);
  }
  return h >>> 0; // Convert to unsigned 32-bit integer
}

/**
 * Get percentage bucket (1-100) for a given string using djb2 hash
 * Useful for rollout percentages and A/B testing
 */
export function getPercentageBucket(str: string): number {
  return (djb2(str) % 100) + 1;
}