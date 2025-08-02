/**
 * Persistent location cache utilities with staleness protection
 */

const MAX_PERSIST_AGE = 2 * 60 * 60 * 1000; // 2 hours

interface CachedCoords {
  lat: number;
  lng: number;
  ts: number;
}

/**
 * Load persisted coordinates with age checking and corruption handling
 */
export function loadPersistedCoords(): { lat: number; lng: number } | null {
  try {
    const raw = localStorage.getItem('floq-lastFix');
    if (!raw) return null;
    
    const cached: CachedCoords = JSON.parse(raw);
    
    // Check for required fields and age
    if (!cached.lat || !cached.lng || !cached.ts) {
      localStorage.removeItem('floq-lastFix');
      return null;
    }
    
    // Reject stale coordinates
    if (Date.now() - cached.ts > MAX_PERSIST_AGE) {
      localStorage.removeItem('floq-lastFix');
      return null;
    }
    
    return { lat: cached.lat, lng: cached.lng };
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