import { useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { metersBetween } from '@/lib/location/geo';

interface ContextState {
  inFloq: boolean;
  atVenue: boolean;
  walking: boolean;
  lastCheck: number;
}

interface LocationPing {
  lat: number;
  lng: number;
  ts: number;
}

/**
 * Hook for detecting user context: in floq, at venue, walking
 * Uses caching and debouncing to avoid expensive API calls
 */
export const useContextDetection = () => {
  const contextRef = useRef<ContextState>({
    inFloq: false,
    atVenue: false,
    walking: false,
    lastCheck: 0,
  });
  
  const floqPromiseRef = useRef<Promise<any> | null>(null);
  const venuePromiseRef = useRef<Promise<any> | null>(null);
  const locationHistoryRef = useRef<LocationPing[]>([]);

  const detectContext = useCallback(async (
    lat: number,
    lng: number,
    accuracy: number,
    requiredContexts: string[]
  ): Promise<{ inFloq: boolean; atVenue: boolean; walking: boolean }> => {
    const now = Date.now();

    // Update location history for walking detection
    locationHistoryRef.current.push({ lat, lng, ts: now });
    // Keep only last 5 minutes of location history
    locationHistoryRef.current = locationHistoryRef.current.filter(
      ping => now - ping.ts < 300_000
    );

    // Only check context every 60 seconds for expensive operations
    const shouldUpdateContext = now - contextRef.current.lastCheck > 60_000;

    if (shouldUpdateContext) {
      contextRef.current.lastCheck = now;

      // Check if user is in a floq
      if (requiredContexts.includes('in_floq')) {
        try {
          if (!floqPromiseRef.current) {
            floqPromiseRef.current = (supabase as any).rpc('get_visible_floqs_with_members', {
              p_lat: lat,
              p_lng: lng,
              p_limit: 20,
              p_offset: 0
            }) as Promise<any>;
          }
          
          const { data: floqs } = await floqPromiseRef.current;
          floqPromiseRef.current = null;
          
          // Consider user "in floq" if within 50m of any active floq
          contextRef.current.inFloq = (floqs ?? []).some((f: any) =>
            f.distance_meters != null && f.distance_meters < 50
          );
        } catch (error) {
          console.error('Error checking floq context:', error);
          contextRef.current.inFloq = false;
        }
      }

      // Check if user is at a venue
      if (requiredContexts.includes('at_venue')) {
        try {
          if (!venuePromiseRef.current) {
            venuePromiseRef.current = (supabase as any).rpc('get_nearby_venues', {
              p_lat: lat,
              p_lng: lng,
              p_radius_km: 0.1, // 100m radius
              p_limit: 1
            }) as Promise<any>;
          }
          
          const { data: venues } = await venuePromiseRef.current;
          venuePromiseRef.current = null;
          
          contextRef.current.atVenue = !!(venues && venues.length > 0);
        } catch (error) {
          console.error('Error checking venue context:', error);
          contextRef.current.atVenue = false;
        }
      }
    }

    // Check walking speed (always calculate if needed)
    if (requiredContexts.includes('walking')) {
      contextRef.current.walking = false;
      
      if (locationHistoryRef.current.length >= 2) {
        // Calculate average speed over recent pings
        const recentPings = locationHistoryRef.current.slice(-3); // Last 3 pings
        let totalDistance = 0;
        let totalTime = 0;
        
        for (let i = 1; i < recentPings.length; i++) {
          const prev = recentPings[i - 1];
          const curr = recentPings[i];
          
          const distance = metersBetween(curr.lat, curr.lng, prev.lat, prev.lng);
          const time = (curr.ts - prev.ts) / 1000; // seconds
          
          totalDistance += distance;
          totalTime += time;
        }
        
        if (totalTime > 0) {
          const avgSpeed = totalDistance / totalTime; // m/s
          // Walking speed: 0.7-2.5 m/s (~2.5-9 km/h)
          contextRef.current.walking = avgSpeed >= 0.7 && avgSpeed <= 2.5;
        }
      }
    }

    return {
      inFloq: contextRef.current.inFloq,
      atVenue: contextRef.current.atVenue,
      walking: contextRef.current.walking,
    };
  }, []);

  const resetContext = useCallback(() => {
    contextRef.current = {
      inFloq: false,
      atVenue: false,
      walking: false,
      lastCheck: 0,
    };
    locationHistoryRef.current = [];
    floqPromiseRef.current = null;
    venuePromiseRef.current = null;
  }, []);

  return {
    detectContext,
    resetContext,
    getCurrentContext: () => ({
      inFloq: contextRef.current.inFloq,
      atVenue: contextRef.current.atVenue,
      walking: contextRef.current.walking,
    }),
  };
};
