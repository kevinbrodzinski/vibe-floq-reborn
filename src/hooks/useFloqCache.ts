import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number; // time to live in milliseconds
  accessCount: number;
  lastAccessed: number;
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number; // approximate size in bytes
  hitRate: number; // percentage of cache hits
  missRate: number; // percentage of cache misses
  averageAccessTime: number; // milliseconds
  oldestEntry: number;
  newestEntry: number;
}

export interface PrefetchStrategy {
  type: 'aggressive' | 'conservative' | 'adaptive';
  threshold: number; // minimum confidence to prefetch
  maxConcurrent: number;
  priority: 'high' | 'medium' | 'low';
}

class FloqCache {
  private cache = new Map<string, CacheEntry>();
  private stats = {
    hits: 0,
    misses: 0,
    totalAccesses: 0,
    totalSize: 0
  };
  private maxSize = 50 * 1024 * 1024; // 50MB
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.startCleanup();
  }

  // Set cache entry with TTL
  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      accessCount: 0,
      lastAccessed: Date.now()
    };

    // Remove old entry if exists
    const oldEntry = this.cache.get(key);
    if (oldEntry) {
      this.stats.totalSize -= this.estimateSize(oldEntry.data);
    }

    this.cache.set(key, entry);
    this.stats.totalSize += this.estimateSize(data);

    // Evict if over size limit
    this.evictIfNeeded();
  }

  // Get cache entry
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      this.stats.totalAccesses++;
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.totalAccesses++;
      return null;
    }

    // Update access stats
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.stats.hits++;
    this.stats.totalAccesses++;

    return entry.data;
  }

  // Check if key exists and is valid
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    return Date.now() - entry.timestamp <= entry.ttl;
  }

  // Remove specific entry
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.stats.totalSize -= this.estimateSize(entry.data);
      return this.cache.delete(key);
    }
    return false;
  }

  // Clear all cache
  clear(): void {
    this.cache.clear();
    this.stats.totalSize = 0;
  }

  // Get cache statistics
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const timestamps = entries.map(e => e.timestamp);
    
    return {
      totalEntries: this.cache.size,
      totalSize: this.stats.totalSize,
      hitRate: this.stats.totalAccesses > 0 ? (this.stats.hits / this.stats.totalAccesses) * 100 : 0,
      missRate: this.stats.totalAccesses > 0 ? (this.stats.misses / this.stats.totalAccesses) * 100 : 0,
      averageAccessTime: entries.length > 0 ? entries.reduce((sum, e) => sum + e.accessCount, 0) / entries.length : 0,
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : 0,
      newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : 0
    };
  }

  // Prefetch data based on user behavior
  prefetch<T>(key: string, fetcher: () => Promise<T>, priority: 'high' | 'medium' | 'low' = 'medium'): void {
    // Don't prefetch if already cached
    if (this.has(key)) return;

    const ttl = priority === 'high' ? 10 * 60 * 1000 : // 10 minutes
                priority === 'medium' ? 5 * 60 * 1000 : // 5 minutes
                2 * 60 * 1000; // 2 minutes

    fetcher().then(data => {
      this.set(key, data, ttl);
    }).catch(error => {
      console.warn('Prefetch failed for key:', key, error);
    });
  }

  // Intelligent prefetching based on user patterns
  intelligentPrefetch<T>(
    baseKey: string,
    relatedKeys: string[],
    fetcher: (key: string) => Promise<T>,
    userBehavior: 'viewing' | 'interacting' | 'idle'
  ): void {
    const priority = userBehavior === 'interacting' ? 'high' :
                    userBehavior === 'viewing' ? 'medium' : 'low';

    // Prefetch related data based on behavior
    relatedKeys.forEach(key => {
      this.prefetch(key, () => fetcher(key), priority);
    });
  }

  // Estimate data size (rough approximation)
  private estimateSize(data: any): number {
    try {
      return JSON.stringify(data).length;
    } catch {
      return 1024; // Default 1KB if serialization fails
    }
  }

  // Evict least recently used entries if over size limit
  private evictIfNeeded(): void {
    if (this.stats.totalSize <= this.maxSize) return;

    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => {
      // Sort by access count and last accessed time
      const aScore = a[1].accessCount * 0.7 + (a[1].lastAccessed / Date.now()) * 0.3;
      const bScore = b[1].accessCount * 0.7 + (b[1].lastAccessed / Date.now()) * 0.3;
      return aScore - bScore;
    });

    // Remove entries until under size limit
    for (const [key, entry] of entries) {
      this.cache.delete(key);
      this.stats.totalSize -= this.estimateSize(entry.data);
      
      if (this.stats.totalSize <= this.maxSize * 0.8) break; // Leave 20% buffer
    }
  }

  // Cleanup expired entries
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.cache.entries()) {
        if (now - entry.timestamp > entry.ttl) {
          this.cache.delete(key);
          this.stats.totalSize -= this.estimateSize(entry.data);
        }
      }
    }, 60000); // Cleanup every minute
  }

  // Stop cleanup interval
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Global cache instance
const floqCache = new FloqCache();

export function useFloqCache() {
  const queryClient = useQueryClient();
  const [stats, setStats] = useState<CacheStats>(floqCache.getStats());
  const statsInterval = useRef<NodeJS.Timeout | null>(null);

  // Update stats periodically
  useEffect(() => {
    statsInterval.current = setInterval(() => {
      setStats(floqCache.getStats());
    }, 5000); // Update every 5 seconds

    return () => {
      if (statsInterval.current) {
        clearInterval(statsInterval.current);
      }
    };
  }, []);

  // Cache operations
  const setCache = useCallback(<T>(key: string, data: T, ttl?: number) => {
    floqCache.set(key, data, ttl);
  }, []);

  const getCache = useCallback(<T>(key: string): T | null => {
    return floqCache.get<T>(key);
  }, []);

  const hasCache = useCallback((key: string): boolean => {
    return floqCache.has(key);
  }, []);

  const deleteCache = useCallback((key: string): boolean => {
    return floqCache.delete(key);
  }, []);

  const clearCache = useCallback(() => {
    floqCache.clear();
  }, []);

  // Intelligent prefetching
  const prefetchData = useCallback(<T>(
    key: string,
    fetcher: () => Promise<T>,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ) => {
    floqCache.prefetch(key, fetcher, priority);
  }, []);

  const intelligentPrefetch = useCallback(<T>(
    baseKey: string,
    relatedKeys: string[],
    fetcher: (key: string) => Promise<T>,
    userBehavior: 'viewing' | 'interacting' | 'idle'
  ) => {
    floqCache.intelligentPrefetch(baseKey, relatedKeys, fetcher, userBehavior);
  }, []);

  // Cache invalidation helpers
  const invalidateFloqData = useCallback((floqId: string) => {
    // Clear cache entries related to this floq
    const keysToDelete: string[] = [];
    // This would need to be implemented based on your cache key patterns
    keysToDelete.forEach(key => floqCache.delete(key));
    
    // Also invalidate React Query cache
    queryClient.invalidateQueries({ queryKey: ['floq', floqId] });
  }, [queryClient]);

  const invalidateUserData = useCallback((userId: string) => {
    // Clear cache entries related to this user
    const keysToDelete: string[] = [];
    // This would need to be implemented based on your cache key patterns
    keysToDelete.forEach(key => floqCache.delete(key));
    
    // Also invalidate React Query cache
    queryClient.invalidateQueries({ queryKey: ['user', userId] });
  }, [queryClient]);

  // Performance monitoring
  const getCachePerformance = useCallback(() => {
    const stats = floqCache.getStats();
    return {
      hitRate: stats.hitRate,
      missRate: stats.missRate,
      totalEntries: stats.totalEntries,
      totalSize: stats.totalSize,
      averageAccessTime: stats.averageAccessTime
    };
  }, []);

  return {
    // Cache operations
    set: setCache,
    get: getCache,
    has: hasCache,
    delete: deleteCache,
    clear: clearCache,
    
    // Prefetching
    prefetch: prefetchData,
    intelligentPrefetch,
    
    // Invalidation
    invalidateFloqData,
    invalidateUserData,
    
    // Statistics
    stats,
    getPerformance: getCachePerformance
  };
} 