import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLiveSettings } from '@/hooks/useLiveSettings';
import { useLiveShareFriends } from '@/hooks/useLiveShareFriends';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useAuth } from '@/providers/AuthProvider';

interface ETAShare {
  friendId: string;
  eta: number; // minutes
  distance: number; // meters
  mode: 'walking' | 'driving' | 'transit';
  updatedAt: number;
}

const ETA_UPDATE_INTERVAL = 120_000; // 2 minutes
const MAX_ETA_DISTANCE = 5000; // 5km max for ETA calculation

/**
 * Hook for calculating and sharing ETA to friends
 */
export const useETASharing = () => {
  const { user } = useAuth();
  const { data: liveSettings } = useLiveSettings();
  const shareTo = useLiveShareFriends();
  const { pos } = useUserLocation();
  
  const etaMapRef = useRef<Map<string, ETAShare>>(new Map());
  const lastUpdateRef = useRef<number>(0);
  const intervalRef = useRef<number | null>(null);

  const calculateETAs = useCallback(async (lat: number, lng: number) => {
    if (!shareTo.length) return;

    try {
      const { data, error } = await supabase.functions.invoke('calculate-eta', {
        body: {
          from_lat: lat,
          from_lng: lng,
          friend_ids: shareTo
        }
      });

      if (error) {
        console.error('Error calculating ETAs:', error);
        return;
      }

      // Update ETA map
      const newETAMap = new Map<string, ETAShare>();
      data?.etas?.forEach((eta: any) => {
        if (eta.distance <= MAX_ETA_DISTANCE) {
          newETAMap.set(eta.other_profile_id, {
            friendId: eta.other_profile_id,
            eta: eta.eta_minutes,
            distance: eta.distance_meters,
            mode: eta.travel_mode,
            updatedAt: Date.now()
          });
        }
      });

      etaMapRef.current = newETAMap;

      // Store ETA data to database for sharing
      if (newETAMap.size > 0 && user) {
        const etaEntries = Array.from(newETAMap.values()).map(eta => ({
          sharer_id: user.id,
          other_profile_id: eta.friendId,
          eta_minutes: eta.eta,
          distance_meters: eta.distance,
          travel_mode: eta.mode
        }));

        const { error: etaError } = await supabase.from('eta_shares')
          .upsert(etaEntries, { onConflict: 'sharer_id,other_profile_id' });
        
        if (etaError) {
          console.error('Error storing ETA shares:', etaError);
        }
      }

    } catch (error) {
      console.error('Error in ETA calculation:', error);
    }
  }, [shareTo]);

  const updateETAs = useCallback(() => {
    if (!pos || !liveSettings?.live_smart_flags?.share_eta) return;

    const now = Date.now();
    if (now - lastUpdateRef.current < ETA_UPDATE_INTERVAL) return;
    
    lastUpdateRef.current = now;
    calculateETAs(pos.lat, pos.lng);
  }, [pos, liveSettings, calculateETAs]);

  // Set up interval for ETA updates
  useEffect(() => {
    if (liveSettings?.live_smart_flags?.share_eta && pos && shareTo.length > 0) {
      intervalRef.current = setInterval(updateETAs, ETA_UPDATE_INTERVAL);
      // Run initial calculation
      updateETAs();
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      etaMapRef.current.clear();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [liveSettings?.live_smart_flags?.share_eta, pos, shareTo.length, updateETAs]);

  return {
    isEnabled: !!liveSettings?.live_smart_flags?.share_eta,
    currentETAs: Array.from(etaMapRef.current.values()),
    getETAToFriend: (friendId: string) => etaMapRef.current.get(friendId),
    hasActiveETAs: etaMapRef.current.size > 0,
  };
};