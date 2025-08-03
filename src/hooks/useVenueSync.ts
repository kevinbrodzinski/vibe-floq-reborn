import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { autoSyncVenues, VenueSyncResult } from '@/lib/api/venues';
import { calculateDistance } from '@/lib/location/standardGeo';
import { toast } from 'sonner';

// Development-only throttling for PostHog events
const throttlePosthog = (event: string, props: any) => {
  if (import.meta.env.MODE === 'development') {
    // In development, throttle events to avoid spam
    const key = `throttle_${event}`;
    const lastSent = sessionStorage.getItem(key);
    const now = Date.now();
    
    if (!lastSent || now - parseInt(lastSent) > 30000) { // 30 second throttle
      sessionStorage.setItem(key, now.toString());
      // Would call posthog.capture here in real implementation
      console.info(`[PostHog] ${event}:`, props);
    }
  } else {
    // In production, capture normally (would call posthog.capture)
    console.info(`[PostHog] ${event}:`, props);
  }
};

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

      // Show toast notifications and track telemetry
      if (showToasts) {
        const totalCount = results.reduce((sum, r) => sum + r.count, 0);
        const successfulSyncs = results.filter(r => r.ok).length;
        const failedSyncs = results.filter(r => !r.ok);
        
        if (totalCount > 0) {
          toast.success(`Found ${totalCount} venues`, {
            description: `Synced from ${successfulSyncs} sources`
          });
          
          throttlePosthog('venue_sync_success', {
            total_count: totalCount,
            successful_sources: successfulSyncs,
            location: { lat, lng }
          });
        } else if (failedSyncs.length > 0) {
          const firstError = failedSyncs[0];
          toast.error('Venue sync temporarily unavailable', {
            description: 'Retrying in 90 seconds...',
            duration: 8000
          });
          
          throttlePosthog('venue_sync_failed', {
            error: firstError.error,
            phase: firstError.phase,
            location: { lat, lng },
            failed_sources: failedSyncs.length
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
        toast.error('Venue sync temporarily unavailable', { 
          description: 'Retrying in 90 seconds...',
          duration: 8000
        });
      }

      throttlePosthog('venue_sync_exception', {
        error: errorMessage,
        location: { lat, lng }
      });

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