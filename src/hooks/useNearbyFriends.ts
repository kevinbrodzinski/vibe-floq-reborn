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
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const env = getEnvironmentConfig();

  const debouncedPrimeProfiles = useCallback((primeProfiles: (users: any[]) => void, users: any[]) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      primeProfiles(users);
    }, 300);
  }, []);

  // TODO: Add real useQuery hook here when implementing live mode
  // const { data: nearbyFriends = [] } = useQuery({
  //   queryKey: ['nearby-friends', lat, lng, km],
  //   enabled: enabled && !!lat && !!lng && env.presenceMode === 'live',
  //   queryFn: async () => {
  //     // Implementation will go here
  //   }
  // });
  
  if (env.presenceMode === 'offline' || env.presenceMode === 'mock') {
    // Return empty array for non-live modes
    const result = {
      data: [],
      isLoading: false,
      error: null,
      isError: false,
      isSuccess: true,
    };
    return { ...result, debouncedPrimeProfiles };
  }

  // Live mode - actual nearby friends data

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