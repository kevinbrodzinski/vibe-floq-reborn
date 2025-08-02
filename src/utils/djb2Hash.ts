/**
 * DJB2 hash function - simple, fast, and well-distributed
 * Better than naive string hashing for deterministic pseudo-randomness
 */
export function djb2Hash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i); // hash * 33 + c
  }
  return Math.abs(hash);
}

/**
 * Generate deterministic pseudo-random number from 0-1
 * Uses DJB2 hash + sine for better distribution than Math.random()
 */
export function deterministicRandom(seed: string, offset = 0): number {
  const hash = djb2Hash(seed + offset);
  // Note: Math.sin distribution isn't perfectly uniform but sufficient for demo data
  // Sine wave ensures we get full 0-1 range with reasonable distribution
  return Math.abs(Math.sin(hash)) % 1;
}