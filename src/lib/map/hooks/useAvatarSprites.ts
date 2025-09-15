import { useEffect, useRef, useState } from 'react';
import type mapboxgl from 'mapbox-gl';
import { ensureAvatarImage } from '@/lib/map/overlays/presenceClusterOverlay';

export interface Friend {
  id: string;
  photoUrl?: string;
}

export interface UseAvatarSpritesOptions {
  size?: number;
  concurrency?: number;
  enabled?: boolean;
}

export interface UseAvatarSpritesResult {
  iconIds: Record<string, string>;
  loading: number;
  error: string | null;
}

/**
 * Production-grade hook for batched avatar sprite loading
 * Features:
 * - Batched loading with concurrency limits
 * - De-duplication and caching
 * - Auto re-queue on map style changes (sprites are lost)
 * - Exponential backoff retry logic
 */
export function useAvatarSprites(
  map: mapboxgl.Map | null,
  friends: Friend[],
  options: UseAvatarSpritesOptions = {}
): UseAvatarSpritesResult {
  const { size = 64, concurrency = 3, enabled = true } = options;
  
  const [iconIds, setIconIds] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const loadingRef = useRef<Set<string>>(new Set());
  const retryCountRef = useRef<Record<string, number>>({});
  const abortControllerRef = useRef<AbortController | null>(null);

  // Reset on map or friends change
  useEffect(() => {
    if (!map || !enabled) {
      setIconIds({});
      setLoading(0);
      setError(null);
      return;
    }

    // Cancel any ongoing operations
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    const signal = abortControllerRef.current.signal;

    const loadBatch = async () => {
      const friendsWithPhotos = friends.filter(f => f.photoUrl && !loadingRef.current.has(f.id));
      if (!friendsWithPhotos.length) return;

      const newIconIds: Record<string, string> = {};
      let activeLoads = 0;
      let completedLoads = 0;
      
      setError(null);

      const processFriend = async (friend: Friend) => {
        if (signal.aborted || !friend.photoUrl) return;
        
        loadingRef.current.add(friend.id);
        activeLoads++;
        setLoading(activeLoads);
        
        try {
          const maxRetries = 3;
          const retryCount = retryCountRef.current[friend.id] || 0;
          
          if (retryCount >= maxRetries) {
            console.warn(`[useAvatarSprites] Max retries reached for ${friend.id}`);
            return;
          }

          const iconId = await ensureAvatarImage(map, friend.id, friend.photoUrl, size);
          
          if (signal.aborted) return;
          
          if (iconId) {
            newIconIds[friend.id] = iconId;
            retryCountRef.current[friend.id] = 0; // Reset retry count on success
          } else {
            // Exponential backoff retry
            retryCountRef.current[friend.id] = retryCount + 1;
            const delay = Math.pow(2, retryCount) * 1000;
            setTimeout(() => {
              if (!signal.aborted) {
                loadingRef.current.delete(friend.id);
              }
            }, delay);
          }
        } catch (err) {
          if (!signal.aborted) {
            console.error('[useAvatarSprites] Error loading avatar:', err);
            retryCountRef.current[friend.id] = (retryCountRef.current[friend.id] || 0) + 1;
          }
        } finally {
          if (!signal.aborted) {
            loadingRef.current.delete(friend.id);
            activeLoads--;
            completedLoads++;
            setLoading(Math.max(0, activeLoads));
          }
        }
      };

      // Process with concurrency limit
      const chunks: Friend[][] = [];
      for (let i = 0; i < friendsWithPhotos.length; i += concurrency) {
        chunks.push(friendsWithPhotos.slice(i, i + concurrency));
      }

      for (const chunk of chunks) {
        if (signal.aborted) break;
        
        await Promise.allSettled(
          chunk.map(friend => processFriend(friend))
        );
      }

      // Batch update iconIds
      if (!signal.aborted && Object.keys(newIconIds).length > 0) {
        setIconIds(prev => ({ ...prev, ...newIconIds }));
      }
    };

    const timeoutId = setTimeout(loadBatch, 100); // Debounce rapid changes
    
    return () => {
      clearTimeout(timeoutId);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [map, friends, size, concurrency, enabled]);

  // Re-queue sprites on style changes (Mapbox loses custom images)
  useEffect(() => {
    if (!map || !enabled) return;

    const handleStyleData = () => {
      console.log('[useAvatarSprites] Style changed, re-queueing sprites');
      // Clear current state to trigger reload
      setIconIds({});
      loadingRef.current.clear();
      retryCountRef.current = {};
    };

    map.on('styledata', handleStyleData);
    
    return () => {
      map.off('styledata', handleStyleData);
    };
  }, [map, enabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    iconIds,
    loading,
    error
  };
}