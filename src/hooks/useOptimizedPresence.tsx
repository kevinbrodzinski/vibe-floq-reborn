import { useEffect, useCallback, useMemo, useRef, useState } from 'react';
import type { TimerId, IntervalId } from '@/types/Timer';
import { useBucketedPresence } from './useBucketedPresence';
import { supabase } from '@/integrations/supabase/client';
import { supaFn } from '@/lib/supaFn';
import { getEnvironmentConfig } from '@/lib/environment';
import { useVibeSessionTracker } from './useVibeSessionTracker';
import type { Vibe } from '@/types';

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

export const useOptimizedPresence = ({
  vibe,
  lat,
  lng,
  broadcastRadius = 500,
  enabled = true
}: OptimizedPresenceOptions): PresenceData => {
  const env = getEnvironmentConfig();
  const { people } = useBucketedPresence(lat, lng);
  
  // Track vibe sessions for achievements
  useVibeSessionTracker(vibe, enabled && !!lat && !!lng);
  
  const lastUpdateRef = useRef<number>(0);
  const retryTimeoutRef = useRef<TimerId | null>(null);
  const intervalRef = useRef<IntervalId | null>(null);
  const lastVibe = useRef<Vibe>(vibe);
  const lastPosition = useRef<{ lat: number; lng: number } | null>(null);
  const [updating, setUpdating] = useState(false);
  
  // Use environment-specific intervals
  const PRESENCE_UPDATE_INTERVAL = env.presenceUpdateInterval;
  const PRESENCE_RETRY_DELAY = env.presenceRetryDelay;

  // Memoized presence data to prevent unnecessary re-renders
  const presenceData = useMemo(() => ({
    people: people || [],
    updating,
    error: null
  }), [people, updating]);

  // Optimized presence update function
  const updatePresenceOptimized = useCallback(async () => {
    if (!enabled || !lat || !lng) return;
    
    // Skip presence updates based on environment mode
    if (!env.enablePresenceUpdates) {
      if (env.debugPresence) {
        console.log(`🔴 Presence updates disabled in ${env.presenceMode} mode`);
      }
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("No auth session");
      
      const res = await supaFn('upsert-presence', session.access_token, {
        vibe,
        lat,
        lng,
        broadcast_radius: broadcastRadius,
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Presence update failed: ${errorText}`);
      }

      lastUpdateRef.current = now;
      lastVibe.current = vibe;
      lastPosition.current = { lat, lng };
      
      if (env.debugPresence) {
        console.log('✅ Presence update successful:', { vibe, lat, lng, broadcastRadius });
      }
      
      // Clear any retry timeout
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    } catch (error) {
      if (env.debugNetwork) {
        console.warn('🔴 Presence update failed, will retry:', error);
      }
      
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
  }, [enabled, lat, lng, vibe, broadcastRadius, env.enablePresenceUpdates, env.debugPresence, env.debugNetwork, PRESENCE_RETRY_DELAY]);

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