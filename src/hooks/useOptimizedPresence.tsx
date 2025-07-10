import { useEffect, useCallback, useMemo, useRef, useState } from 'react';
import { useBucketedPresence } from './useBucketedPresence';
import { supabase } from '@/integrations/supabase/client';
import type { Vibe } from '@/types';

const OFFLINE_MODE = import.meta.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';

interface OptimizedPresenceOptions {
  vibe: Vibe;
  lat?: number;
  lng?: number;
  broadcastRadius?: number;
  enabled?: boolean;
}

interface PresenceData {
  people: any[];
  updating: boolean;
  error: string | null;
}

const PRESENCE_UPDATE_INTERVAL = 10000; // 10 seconds
const PRESENCE_RETRY_DELAY = 5000; // 5 seconds

export const useOptimizedPresence = ({
  vibe,
  lat,
  lng,
  broadcastRadius = 500,
  enabled = true
}: OptimizedPresenceOptions): PresenceData => {
  const { people } = useBucketedPresence(lat, lng);
  
  const lastUpdateRef = useRef<number>(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastVibe = useRef<Vibe>(vibe);
  const lastPosition = useRef<{ lat: number; lng: number } | null>(null);
  const [updating, setUpdating] = useState(false);

  // Memoized presence data to prevent unnecessary re-renders
  const presenceData = useMemo(() => ({
    people: people || [],
    updating,
    error: null
  }), [people, updating]);

  // Optimized presence update function
  const updatePresenceOptimized = useCallback(async () => {
    if (!enabled || !lat || !lng) return;
    
    // Skip presence updates in offline mode
    if (OFFLINE_MODE) {
      console.log('Offline mode: Skipping presence update');
      return;
    }

    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateRef.current;
    
    // Skip if updated recently, unless vibe or significant position changed
    const vibeChanged = lastVibe.current !== vibe;
    const positionChanged = !lastPosition.current || 
      Math.abs(lastPosition.current.lat - lat) > 0.0001 || 
      Math.abs(lastPosition.current.lng - lng) > 0.0001;
    
    if (timeSinceLastUpdate < PRESENCE_UPDATE_INTERVAL && !vibeChanged && !positionChanged) {
      return;
    }

    setUpdating(true);
    try {
      // Use Supabase edge function for presence updates
      const { error } = await supabase.functions.invoke('upsert-presence', {
        body: {
          vibe,
          lat,
          lng,
          broadcast_radius: broadcastRadius,
        },
      });

      if (error) {
        throw new Error(`Presence update failed: ${error.message}`);
      }

      lastUpdateRef.current = now;
      lastVibe.current = vibe;
      lastPosition.current = { lat, lng };
      
      // Clear any retry timeout
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    } catch (error) {
      console.warn('Presence update failed, will retry:', error);
      
      // Retry after delay
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      retryTimeoutRef.current = setTimeout(() => {
        updatePresenceOptimized();
      }, PRESENCE_RETRY_DELAY);
    } finally {
      setUpdating(false);
    }
  }, [enabled, lat, lng, vibe, broadcastRadius]);

  // Set up presence updates
  useEffect(() => {
    if (!enabled || !lat || !lng) return;

    // Initial update
    updatePresenceOptimized();

    // Set up interval for regular updates
    intervalRef.current = setInterval(updatePresenceOptimized, PRESENCE_UPDATE_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [updatePresenceOptimized, enabled, lat, lng]);

  // Handle vibe changes immediately
  useEffect(() => {
    if (vibe !== lastVibe.current && enabled && lat && lng) {
      updatePresenceOptimized();
    }
  }, [vibe, updatePresenceOptimized, enabled, lat, lng]);

  return presenceData;
};