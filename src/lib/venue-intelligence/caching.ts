interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class VenueRecommendationCache {
  private cache = new Map<string, CacheEntry<any>>();
  private maxSize = 100; // Maximum number of cache entries

  set<T>(key: string, data: T, ttlMinutes: number = 10): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = Array.from(this.cache.keys())[0];
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMinutes * 60 * 1000
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// Global cache instance
export const venueCache = new VenueRecommendationCache();

// Cache key generators
export const CacheKeys = {
  venues: (lat: number, lng: number, radius: number = 5) => 
    `venues:${lat.toFixed(3)}:${lng.toFixed(3)}:${radius}`,
  
  friendNetwork: (userId: string) => 
    `friends:${userId}`,
  
  crowdIntelligence: (venueId: string) => 
    `crowd:${venueId}`,
  
  vibeMatch: (userId: string, venueId: string) => 
    `vibe:${userId}:${venueId}`,
  
  weather: (lat: number, lng: number) => 
    `weather:${lat.toFixed(2)}:${lng.toFixed(2)}`,
  
  recommendations: (userId: string, lat: number, lng: number) =>
    `recs:${userId}:${lat.toFixed(3)}:${lng.toFixed(3)}`
};

// Cached wrapper functions
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMinutes: number = 10
): Promise<T> {
  // Try to get from cache first
  const cached = venueCache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch fresh data
  const data = await fetcher();
  
  // Cache the result
  venueCache.set(key, data, ttlMinutes);
  
  return data;
}

// Periodic cleanup
setInterval(() => {
  venueCache.cleanup();
}, 5 * 60 * 1000); // Clean up every 5 minutes

// Cache statistics for monitoring
export function getCacheStats() {
  return {
    size: venueCache.size(),
    maxSize: 100,
    hitRate: 'Not tracked', // Could be enhanced to track hit/miss rates
  };
}