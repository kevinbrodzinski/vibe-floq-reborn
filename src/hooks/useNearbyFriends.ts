import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCallback, useRef } from "react";
import { getEnvironmentConfig } from '@/lib/environment';

interface NearbyFriend {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  lat: number;
  lng: number;
  distance_m: number;
}

interface UseNearbyFriendsOptions {
  km?: number;             // default radius
  enabled?: boolean;
}

/**
 * Returns online friends within `km` radius of (lat,lng).
 */
export function useNearbyFriends(
  lat?: number,
  lng?: number,
  { km = 1, enabled = true }: UseNearbyFriendsOptions = {}
) {
  const debounceRef = useRef<NodeJS.Timeout>();

  const debouncedPrimeProfiles = useCallback((primeProfiles: (users: any[]) => void, users: any[]) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      primeProfiles(users);
    }, 300);
  }, []);

  const env = getEnvironmentConfig();
  
  if (env.presenceMode === 'mock') {
    const result = {
      data: [] as NearbyFriend[],
      isLoading: false,
      error: null,
      isError: false,
      isSuccess: true,
    };
    return { ...result, debouncedPrimeProfiles };
  }

  if (env.presenceMode === 'stub') {
    // Return stub data for testing UI
    const stubFriends: NearbyFriend[] = lat && lng ? [
      {
        id: 'stub-friend-1',
        display_name: 'Alex Johnson',
        avatar_url: null,
        lat: lat + 0.001,
        lng: lng + 0.001,
        distance_m: 150
      },
      {
        id: 'stub-friend-2', 
        display_name: 'Sarah Chen',
        avatar_url: null,
        lat: lat - 0.0005,
        lng: lng + 0.0005,
        distance_m: 80
      }
    ] : [];
    
    const result = {
      data: stubFriends,
      isLoading: false,
      error: null,
      isError: false,
      isSuccess: true,
    };
    return { ...result, debouncedPrimeProfiles };
  }

  // TODO: Implement live nearby friends queries
  // For now, return empty data even in live mode until implementation is ready
  const result = {
    data: [] as NearbyFriend[],
    isLoading: false,
    error: null,
    isError: false,
    isSuccess: true,
  };
  
  if (env.debugPresence) {
    console.log('🔴 useNearbyFriends - Live mode not yet implemented, returning empty data');
  }
  
  return { ...result, debouncedPrimeProfiles };
}