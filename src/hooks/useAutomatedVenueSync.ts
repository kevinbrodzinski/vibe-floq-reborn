import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";

interface AutoSyncOptions {
  enabled?: boolean;
  forceRefresh?: boolean;
  sources?: string[];
  backgroundSync?: boolean;
  syncRadius?: number;
}

interface SyncResult {
  ok: boolean;
  total_venues: number;
  new_venues: number;
  updated_venues: number;
  deduplicated: number;
  sources_used: string[];
  sync_time_ms: number;
  errors: string[];
}

interface SyncStatus {
  isLoading: boolean;
  lastSync?: Date;
  result?: SyncResult;
  error?: string;
}

const SYNC_DEBOUNCE_MS = 2000; // Wait 2 seconds after map movement stops
const BACKGROUND_SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes
const SYNC_GRID_SIZE = 0.01; // ~1km grid for caching

// Generate a grid key for location-based caching
function getGridKey(lat: number, lng: number): string {
  const gridLat = Math.floor(lat / SYNC_GRID_SIZE) * SYNC_GRID_SIZE;
  const gridLng = Math.floor(lng / SYNC_GRID_SIZE) * SYNC_GRID_SIZE;
  return `${gridLat.toFixed(3)},${gridLng.toFixed(3)}`;
}

// Check if coordinates are significantly different
function isSignificantMove(
  from: { lat: number; lng: number } | null,
  to: { lat: number; lng: number }
): boolean {
  if (!from) return true;
  
  const latDiff = Math.abs(from.lat - to.lat);
  const lngDiff = Math.abs(from.lng - to.lng);
  
  // Trigger sync if moved more than ~500m
  return latDiff > 0.005 || lngDiff > 0.005;
}

export function useAutomatedVenueSync(
  lat: number | null,
  lng: number | null,
  options: AutoSyncOptions = {}
) {
  const {
    enabled = true,
    forceRefresh = false,
    sources = ['google', 'foursquare'],
    backgroundSync = true,
    syncRadius = 1500
  } = options;

  const queryClient = useQueryClient();
  const lastSyncLocation = useRef<{ lat: number; lng: number } | null>(null);
  const backgroundSyncTimer = useRef<NodeJS.Timeout | null>(null);
  
  // Debounce coordinates to avoid excessive API calls during map panning
  const debouncedCoords = useDebounce(
    lat !== null && lng !== null ? { lat, lng } : null,
    SYNC_DEBOUNCE_MS
  );

  // Main sync function
  const syncVenues = useCallback(async (
    syncLat: number,
    syncLng: number,
    syncOptions: Partial<AutoSyncOptions> = {}
  ): Promise<SyncResult> => {
    const { data, error } = await supabase.functions.invoke('automated-venue-sync', {
      body: {
        lat: syncLat,
        lng: syncLng,
        force_refresh: syncOptions.forceRefresh || forceRefresh,
        sources: syncOptions.sources || sources,
        radius: syncRadius
      }
    });

    if (error) {
      throw new Error(`Venue sync failed: ${error.message}`);
    }

    return data;
  }, [forceRefresh, sources, syncRadius]);

  // Query for automated venue syncing
  const syncQuery = useQuery({
    queryKey: [
      'automated-venue-sync',
      debouncedCoords?.lat,
      debouncedCoords?.lng,
      sources.join(','),
      forceRefresh
    ],
    queryFn: async () => {
      if (!debouncedCoords) return null;
      
      const { lat: syncLat, lng: syncLng } = debouncedCoords;
      
      // Check if we need to sync this location
      if (!forceRefresh && !isSignificantMove(lastSyncLocation.current, debouncedCoords)) {
        return { skipped: true, reason: 'No significant movement' };
      }

      console.log(`[AutoVenueSync] Syncing venues for ${syncLat}, ${syncLng}`);
      
      const result = await syncVenues(syncLat, syncLng);
      
      // Update last sync location
      lastSyncLocation.current = { lat: syncLat, lng: syncLng };
      
      // Invalidate venue queries to refresh the UI
      await queryClient.invalidateQueries({
        queryKey: ['cluster-venues']
      });
      
      return result;
    },
    enabled: enabled && debouncedCoords !== null,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: (failureCount, error) => {
      // Don't retry if it's a configuration error
      if (error?.message?.includes('API key not configured')) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Background sync for current location
  useEffect(() => {
    if (!backgroundSync || !debouncedCoords) return;

    const startBackgroundSync = () => {
      backgroundSyncTimer.current = setInterval(async () => {
        if (!debouncedCoords) return;

        try {
          console.log('[AutoVenueSync] Background sync triggered');
          await syncVenues(debouncedCoords.lat, debouncedCoords.lng, {
            forceRefresh: false
          });
          
          // Silently update the cache
          queryClient.invalidateQueries({
            queryKey: ['cluster-venues'],
            exact: false
          });
        } catch (error) {
          console.warn('[AutoVenueSync] Background sync failed:', error);
        }
      }, BACKGROUND_SYNC_INTERVAL);
    };

    // Clear existing timer
    if (backgroundSyncTimer.current) {
      clearInterval(backgroundSyncTimer.current);
    }

    // Start new timer
    startBackgroundSync();

    return () => {
      if (backgroundSyncTimer.current) {
        clearInterval(backgroundSyncTimer.current);
        backgroundSyncTimer.current = null;
      }
    };
  }, [debouncedCoords, backgroundSync, syncVenues, queryClient]);

  // Manual sync function for force refresh
  const triggerSync = useCallback(async (
    targetLat?: number,
    targetLng?: number,
    syncOptions: Partial<AutoSyncOptions> = {}
  ) => {
    const syncLat = targetLat ?? lat;
    const syncLng = targetLng ?? lng;
    
    if (syncLat === null || syncLng === null) {
      throw new Error('No coordinates provided for sync');
    }

    const result = await syncVenues(syncLat, syncLng, {
      ...syncOptions,
      forceRefresh: true
    });

    // Invalidate and refetch venue data
    await queryClient.invalidateQueries({
      queryKey: ['cluster-venues']
    });

    return result;
  }, [lat, lng, syncVenues, queryClient]);

  // Get sync status for the current location
  const getSyncStatus = useCallback((): SyncStatus => {
    return {
      isLoading: syncQuery.isLoading || syncQuery.isFetching,
      lastSync: syncQuery.dataUpdatedAt ? new Date(syncQuery.dataUpdatedAt) : undefined,
      result: syncQuery.data && !('skipped' in syncQuery.data) ? syncQuery.data as SyncResult : undefined,
      error: syncQuery.error?.message
    };
  }, [syncQuery]);

  // Check if a location needs syncing
  const needsSync = useCallback((checkLat: number, checkLng: number): boolean => {
    const gridKey = getGridKey(checkLat, checkLng);
    const cachedData = queryClient.getQueryData([
      'automated-venue-sync',
      checkLat,
      checkLng,
      sources.join(','),
      false
    ]);
    
    return !cachedData || Date.now() - (syncQuery.dataUpdatedAt || 0) > 10 * 60 * 1000;
  }, [queryClient, sources, syncQuery.dataUpdatedAt]);

  return {
    // Current sync state
    isLoading: syncQuery.isLoading,
    isSyncing: syncQuery.isFetching,
    error: syncQuery.error,
    data: syncQuery.data,
    
    // Sync controls
    triggerSync,
    needsSync,
    getSyncStatus,
    
    // Sync statistics
    lastSyncTime: syncQuery.dataUpdatedAt ? new Date(syncQuery.dataUpdatedAt) : null,
    syncCount: syncQuery.fetchStatus === 'idle' ? 0 : 1,
    
    // Configuration
    isEnabled: enabled,
    sources,
    syncRadius
  };
}

// Hook for getting sync statistics across all locations
export function useVenueSyncStats() {
  return useQuery({
    queryKey: ['venue-sync-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sync_log')
        .select('created_at, metadata')
        .eq('kind', 'automated_venue_sync')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const stats = {
        totalSyncs: data?.length || 0,
        lastSync: data?.[0]?.created_at ? new Date(data[0].created_at) : null,
        successRate: 0,
        averageVenues: 0,
        totalVenues: 0
      };

      if (data && data.length > 0) {
        const successfulSyncs = data.filter(log => 
          log.metadata?.result?.ok === true
        );
        
        stats.successRate = (successfulSyncs.length / data.length) * 100;
        
        const venueCount = successfulSyncs.reduce((sum, log) => 
          sum + (log.metadata?.result?.total_venues || 0), 0
        );
        
        stats.averageVenues = venueCount / Math.max(successfulSyncs.length, 1);
        stats.totalVenues = venueCount;
      }

      return stats;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000 // 15 minutes
  });
}