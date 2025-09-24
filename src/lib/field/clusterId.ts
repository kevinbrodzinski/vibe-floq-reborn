/**
 * Stable cluster ID generation from tile provenance
 * Ensures consistent cluster identity across frames
 */
export const stableClusterId = (ids: string[]): string => {
  // Sort first 8 IDs for deterministic hash
  const sortedIds = ids.slice(0, 8).sort();
  const data = sortedIds.join('|');
  
  // FNV-1a hash for consistent, fast hashing
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < data.length; i++) {
    hash = (hash ^ data.charCodeAt(i)) * 16777619 >>> 0;
  }
  
  return `c_${hash.toString(16)}`;
};