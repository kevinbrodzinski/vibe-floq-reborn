/**
 * Persistent location cache utilities with staleness protection
 */

export const MAX_PERSIST_AGE = 2 * 60 * 60 * 1000; // 2 hours

export interface CachedCoords {
  lat: number;
  lng: number;
  ts: number;
}

/**
 * Check if coordinates are stale based on timestamp
 */
export function isStale(ts: number): boolean {
  return Date.now() - ts > MAX_PERSIST_AGE;
}

/**
 * Load persisted coordinates with age checking and corruption handling
 */
export function loadPersistedCoords(): CachedCoords | null {
  try {
    const raw = localStorage.getItem('floq-lastFix');
    if (!raw) return null;
    
    const cached: CachedCoords = JSON.parse(raw);
    
    // Check for required fields
    if (typeof cached.lat !== 'number' || typeof cached.lng !== 'number' || typeof cached.ts !== 'number') {
      localStorage.removeItem('floq-lastFix');
      return null;
    }
    
    // Reject stale coordinates
    if (isStale(cached.ts)) {
      localStorage.removeItem('floq-lastFix');
      return null;
    }
    
    return cached;
  } catch {
    // Remove corrupted cache to prevent loops
    localStorage.removeItem('floq-lastFix');
    return null;
  }
}

/**
 * Save coordinates to persistent cache with timestamp
 */
export function savePersistedCoords(coords: { lat: number; lng: number }): void {
  try {
    const cached: CachedCoords = {
      ...coords,
      ts: Date.now()
    };
    localStorage.setItem('floq-lastFix', JSON.stringify(cached));
  } catch {
    // Safari private mode or quota exceeded - fail silently
  }
}