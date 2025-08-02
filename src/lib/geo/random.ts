/**
 * DJB2 hash function - collision-resistant and overflow-safe
 * Replaces the previous 32-bit left-shift approach to prevent signed integer overflow
 */
export const djb2hash = (str: string, salt: number = 0): number => {
  let h = 5381 + salt;
  for (let i = 0; i < str.length; i++) {
    h = (h * 33) ^ str.charCodeAt(i);
  }
  return h >>> 0; // Convert to unsigned 32-bit integer
};

/**
 * Generate deterministic pseudo-random number from 0-1
 * Safe for any string length including H3 IDs and UTF-8 content
 */
export const deterministicRandom = (seedStr: string, salt = 0): number => {
  return (djb2hash(seedStr, salt) % 10_000) / 10_000;
};