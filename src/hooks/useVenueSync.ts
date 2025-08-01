import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { autoSyncVenues, VenueSyncResult } from '@/lib/api/venues';
import { calculateDistance } from '@/lib/location/standardGeo';
import { toast } from 'sonner';

interface VenueSyncState {
  isLoading: boolean;
  lastSyncLocation: { lat: number; lng: number } | null;
  results: VenueSyncResult[];
  error: string | null;
}

interface UseVenueSyncOptions {
  /** Minimum distance in meters before triggering a new sync */
  minDistanceM?: number;
  /** Auto-sync when location changes */
  autoSync?: boolean;
  /** Show toast notifications for sync results */
  showToasts?: boolean;
}

export function useVenueSync(options: UseVenueSyncOptions = {}) {
  const { 
    minDistanceM = 500, 
    autoSync = true, 
    showToasts = false 
  } = options;
  
  const { user } = useAuth();
  const [state, setState] = useState<VenueSyncState>({
    isLoading: false,
    lastSyncLocation: null,
    results: [],
    error: null
  });

  const syncVenues = useCallback(async (lat: number, lng: number, force = false) => {
    // Check if we need to sync based on distance
    if (!force && state.lastSyncLocation) {
      const distance = calculateDistance(state.lastSyncLocation, { lat, lng });
      if (distance < minDistanceM) {
        return state.results;
      }
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const results = await autoSyncVenues(lat, lng, user?.id);
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        lastSyncLocation: { lat, lng },
        results,
        error: null
      }));

      // Show toast notifications if enabled
      if (showToasts) {
        const totalCount = results.reduce((sum, r) => sum + r.count, 0);
        const successfulSyncs = results.filter(r => r.ok).length;
        
        if (totalCount > 0) {
          toast.success(`Found ${totalCount} venues`, {
            description: `Synced from ${successfulSyncs} sources`
          });
        } else if (results.some(r => !r.ok)) {
          toast.error('Venue sync failed', {
            description: results.find(r => !r.ok)?.error || 'Unknown error'
          });
        }
      }

      return results;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));

      if (showToasts) {
        toast.error('Venue sync failed', { description: errorMessage });
      }

      throw error;
    }
  }, [minDistanceM, user?.id, showToasts, state.lastSyncLocation, state.results]);

  const manualSync = useCallback((lat: number, lng: number) => {
    return syncVenues(lat, lng, true);
  }, [syncVenues]);

  return {
    ...state,
    syncVenues,
    manualSync
  };
}

/**
 * Hook that automatically syncs venues when location changes
 */
export function useAutoVenueSync(
  lat?: number, 
  lng?: number, 
  options: UseVenueSyncOptions = {}
) {
  const venueSync = useVenueSync({ autoSync: true, ...options });

  useEffect(() => {
    if (lat && lng && options.autoSync !== false) {
      venueSync.syncVenues(lat, lng);
    }
  }, [lat, lng, venueSync.syncVenues, options.autoSync]);

  return venueSync;
}