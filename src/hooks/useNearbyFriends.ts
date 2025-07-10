import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCallback, useRef } from "react";

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

  const OFFLINE_MODE = import.meta.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';
  
  if (OFFLINE_MODE) {
    const result = {
      data: [] as NearbyFriend[],
      isLoading: false,
      error: null,
      isError: false,
      isSuccess: true,
    };
    return { ...result, debouncedPrimeProfiles };
  }

  // TODO: Re-enable nearby friends queries when network is stable
  const result = {
    data: [] as NearbyFriend[],
    isLoading: false,
    error: null,
    isError: false,
    isSuccess: true,
  };
  return { ...result, debouncedPrimeProfiles };
}